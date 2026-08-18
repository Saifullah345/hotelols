'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Pencil, Trash2, Loader2, X, AlertTriangle,
  LayoutList, LayoutGrid, Mail, Phone, Plus,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { DEPARTMENTS, SHIFTS, type StaffStatus } from '@/lib/staff-constants'
import { isValidEmail } from '@/lib/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { isUnlimited, limitReached, usagePercent, usageLevel } from '@/lib/plan-features'

export type StaffMember = {
  id: string
  name:       string | null
  email:      string | null
  phone:      string | null
  department: string
  position:   string
  is_active:  boolean
  status:     StaffStatus
  shift:      string | null
  salary:     number
  user_id:    string | null
  /** Fallback for existing staff linked to a profile */
  user?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
}

const displayName = (s: StaffMember) =>
  s.name?.trim() || s.user?.full_name?.trim() || 'Staff member'

const displayEmail = (s: StaffMember) =>
  s.email?.trim() || s.user?.email?.trim() || null

const displayPhone = (s: StaffMember) =>
  s.phone?.trim() || s.user?.phone?.trim() || null

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100  text-amber-700',
  'bg-rose-100   text-rose-700',
  'bg-sky-100    text-sky-700',
  'bg-purple-100 text-purple-700',
]

function avatarColor(id: string) {
  const hash = [...id].reduce((h, c) => h + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function StatusBadge({ status }: { status: StaffStatus }) {
  if (status === 'active')   return <span className="badge-green">Active</span>
  if (status === 'on_leave') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">On Leave</span>
  return <span className="badge-red">Inactive</span>
}

// ── Input sanitization ────────────────────────────────────────────────
function sanitizePosition(value: string) {
  // Letters, digits, spaces, & and () only. Blocks dots, dashes, slashes and quotes
  // which appear in garbled/injected entries but not in real job titles.
  return value.replace(/[^a-zA-ZÀ-ɏ0-9\s&(),]/g, '')
}

// ── Shared form fields ────────────────────────────────────────────────
function StaffFields({
  name, setName,
  email, setEmail,
  phone, setPhone,
  department, setDepartment,
  position, setPosition,
  shift, setShift,
  salary, setSalary,
}: {
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  phone: string; setPhone: (v: string) => void
  department: string; setDepartment: (v: string) => void
  position: string; setPosition: (v: string) => void
  shift: string; setShift: (v: string) => void
  salary: string; setSalary: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name <span className="text-red-400">*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, ''))}
            maxLength={50}
            className="input" placeholder="Jane Smith"
          />
        </div>
        <div className="min-w-0">
          <label className="label">Phone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Email <span className="text-red-400">*</span></label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value.replace(/[^a-zA-Z0-9._%+\-@]/g, ''))}
            maxLength={100}
            className="input" placeholder="jane@hotel.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Department <span className="text-red-400">*</span></label>
          <select value={department} onChange={e => setDepartment(e.target.value)} className="input">
            <option value="" disabled>Select department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Position / Role <span className="text-red-400">*</span></label>
          <input value={position} onChange={e => setPosition(sanitizePosition(e.target.value))} maxLength={60} className="input" placeholder="Head Chef" />
        </div>
        <div>
          <label className="label">Shift</label>
          <select value={shift} onChange={e => setShift(e.target.value)} className="input">
            <option value="">Not assigned</option>
            {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Monthly Salary (Rs)</label>
          <input
            type="number" min="0" step="100"
            value={salary} onChange={e => setSalary(e.target.value)}
            className="input" placeholder="3000"
          />
        </div>
      </div>
    </div>
  )
}

// ── Add modal ─────────────────────────────────────────────────────────
function AddStaffModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [department, setDepartment] = useState('')
  const [position,   setPosition]   = useState('')
  const [shift,      setShift]      = useState('')
  const [salary,     setSalary]     = useState('0')
  const [saving,     setSaving]     = useState(false)

  const save = async () => {
    const nameTrimmed = name.trim()
    if (!nameTrimmed)                             { toast.error('Name is required');                         return }
    if (nameTrimmed.length < 2)                   { toast.error('Name must be at least 2 characters');       return }
    if (nameTrimmed.length > 50)                  { toast.error('Name cannot exceed 50 characters');         return }
    if (!department)                              { toast.error('Department is required');                   return }
    const posText = position.trim()
    if (!posText)                                 { toast.error('Position is required');                            return }
    if (posText.length < 2)                       { toast.error('Position must be at least 2 characters');         return }
    if (posText.length > 60)                      { toast.error('Position cannot exceed 60 characters');           return }
    if (!/[a-zA-Z]/.test(posText))               { toast.error('Position must contain at least one letter');      return }
    if (/[.\-/'"\\]/.test(posText))              { toast.error('Position cannot contain dots, dashes, or slashes'); return }
    const emailText = email.trim()
    if (!emailText)                               { toast.error('Email is required');                        return }
    if (!isValidEmail(emailText))                 { toast.error('Enter a valid email address');              return }

    setSaving(true)
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameTrimmed, email: emailText, phone, department, position: posText, shift: shift || null, salary: parseFloat(salary) || 0 }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to add staff member'); return }
    toast.success('Staff member added')
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">Add Staff Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden flex-1 p-6">
          <StaffFields
            name={name} setName={setName}
            email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone}
            department={department} setDepartment={setDepartment}
            position={position} setPosition={setPosition}
            shift={shift} setShift={setShift}
            salary={salary} setSalary={setSalary}
          />
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Adding…' : 'Add Staff Member'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────
function EditStaffModal({ member, onClose, onSaved }: {
  member: StaffMember; onClose: () => void; onSaved: () => void
}) {
  const [name,       setName]       = useState(displayName(member))
  const [email,      setEmail]      = useState(displayEmail(member) ?? '')
  const [phone,      setPhone]      = useState(displayPhone(member) ?? '')
  const [department, setDepartment] = useState(member.department)
  const [position,   setPosition]   = useState(member.position)
  const [shift,      setShift]      = useState(member.shift ?? '')
  const [salary,     setSalary]     = useState(String(member.salary ?? 0))
  const [status,     setStatus]     = useState<StaffStatus>(member.status ?? 'active')
  const [saving,     setSaving]     = useState(false)

  const save = async () => {
    const nameTrimmed = name.trim()
    if (!nameTrimmed)                             { toast.error('Name is required');                         return }
    if (nameTrimmed.length < 2)                   { toast.error('Name must be at least 2 characters');       return }
    if (nameTrimmed.length > 50)                  { toast.error('Name cannot exceed 50 characters');         return }
    const posText = position.trim()
    if (!posText)                                 { toast.error('Position is required');                            return }
    if (posText.length < 2)                       { toast.error('Position must be at least 2 characters');         return }
    if (posText.length > 60)                      { toast.error('Position cannot exceed 60 characters');           return }
    if (!/[a-zA-Z]/.test(posText))               { toast.error('Position must contain at least one letter');      return }
    if (/[.\-/'"\\]/.test(posText))              { toast.error('Position cannot contain dots, dashes, or slashes'); return }
    const emailText = email.trim()
    if (!emailText)                               { toast.error('Email is required');                        return }
    if (!isValidEmail(emailText))                 { toast.error('Enter a valid email address');              return }

    setSaving(true)
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameTrimmed, email: emailText, phone: phone || null, department, position: posText, shift: shift || null, salary: parseFloat(salary) || 0, status }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update'); return }
    toast.success('Staff member updated')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(member.id)}`}>
              {displayName(member)[0]?.toUpperCase()}
            </div>
            <h3 className="text-base font-bold text-gray-900">Edit {displayName(member)}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 p-6 space-y-5">
          <StaffFields
            name={name} setName={setName}
            email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone}
            department={department} setDepartment={setDepartment}
            position={position} setPosition={setPosition}
            shift={shift} setShift={setShift}
            salary={salary} setSalary={setSalary}
          />

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['active', 'on_leave', 'inactive'] as StaffStatus[]).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                    status === s
                      ? s === 'active'   ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : s === 'on_leave' ? 'border-amber-500  bg-amber-50  text-amber-700'
                      :                    'border-red-500    bg-red-50    text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {s === 'on_leave' ? 'On Leave' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────
function DeleteStaffModal({ member, onClose, onDeleted }: {
  member: StaffMember; onClose: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    setDeleting(true)
    const res = await fetch(`/api/admin/staff/${member.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to remove'); return }
    toast.success('Staff member removed')
    if (json.warning) toast.warning(json.warning)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onClose} disabled={deleting} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Remove Staff Member?</h3>
        <p className="text-sm text-gray-700 font-semibold text-center">{displayName(member)}</p>
        <p className="text-xs text-gray-500 text-center mt-1 mb-6">
          {member.position} · {member.department}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={del} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Grid card ─────────────────────────────────────────────────────────
function StaffCard({ member, onEdit, onDelete }: {
  member: StaffMember; onEdit: () => void; onDelete: () => void
}) {
  const shiftLabel = SHIFTS.find(s => s.value === member.shift)?.label ?? '—'
  const email = displayEmail(member)
  const phone = displayPhone(member)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${avatarColor(member.id)}`}>
            {displayName(member)[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{displayName(member)}</p>
            <p className="text-xs text-primary-600 font-medium">{member.position}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Department</span>
          <span>{member.department}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Shift</span>
          <span>{shiftLabel}</span>
        </div>
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Salary</span>
          <span className="font-semibold text-gray-900">Rs {member.salary.toLocaleString()}/mo</span>
        </div>
      </div>

      {(email || phone) && (
        <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-3">
          {email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" />{email}</p>}
          {phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{phone}</p>}
        </div>
      )}

      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={onDelete}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const PER_PAGE = 10

// ── Main component ────────────────────────────────────────────────────
export default function StaffClient({
  staff,
  planMaxStaff = -1,
  planName = '',
  totalActiveStaff = 0,
}: {
  staff: StaffMember[]
  planMaxStaff?: number
  planName?: string
  totalActiveStaff?: number
}) {
  const router = useRouter()
  const [view,     setView]     = useState<'table' | 'grid'>('table')
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState<StaffMember | null>(null)
  const [deleting, setDeleting] = useState<StaffMember | null>(null)
  const [page,     setPage]     = useState(1)

  const refresh = () => router.refresh()

  // Reset to page 1 whenever the staff list changes (filter applied)
  useEffect(() => { setPage(1) }, [staff])

  const totalPages = Math.max(1, Math.ceil(staff.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paged      = staff.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <>
      {/* Toolbar: Add button + view toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {!isUnlimited(planMaxStaff) && (() => {
            const level = usageLevel(planMaxStaff, totalActiveStaff)
            const pct   = usagePercent(planMaxStaff, totalActiveStaff)
            const chipClass = level === 'limit'    ? 'bg-red-50 text-red-700 border-red-200'
                            : level === 'critical' ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : level === 'warning'  ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-primary-50 text-primary-700 border-primary-100'
            const barColor  = level === 'limit'    ? 'bg-red-400'
                            : level === 'critical' ? 'bg-orange-400'
                            : level === 'warning'  ? 'bg-amber-400'
                            : 'bg-primary-400'
            return (
              <div className={`inline-flex flex-col gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border ${chipClass} ${level === 'critical' ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <span>{totalActiveStaff} / {planMaxStaff} staff</span>
                  {planName && <span className="font-normal opacity-70 capitalize">· {planName}</span>}
                  {level !== 'normal' && (
                    <Link href="/hotel-admin/billing" className="ml-1 font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity">
                      Upgrade →
                    </Link>
                  )}
                </div>
                {level !== 'normal' && (
                  <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })()}
          {limitReached(planMaxStaff, totalActiveStaff) ? (
            <span
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-200 text-gray-400 text-sm font-semibold cursor-not-allowed"
              title={`Staff limit reached (${planMaxStaff}). Upgrade your plan.`}
            >
              <Plus className="h-4 w-4" /> Add Staff Member
            </span>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Staff Member
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          <button onClick={() => setView('table')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <LayoutList className="h-4 w-4" />
          </button>
          <button onClick={() => setView('grid')}
            className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {view === 'grid' ? (
        staff.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">No staff found. Add your first team member above.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map(s => (
              <StaffCard key={s.id} member={s} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
            ))}
          </div>
        )
      ) : (
        /* Table view */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">Member</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Shift</th>
                  <th className="table-header">Salary</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map(s => {
                  const shiftLabel = SHIFTS.find(sh => sh.value === s.shift)?.label ?? '—'
                  const email = displayEmail(s)
                  const phone = displayPhone(s)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(s.id)}`}>
                            {displayName(s)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{displayName(s)}</p>
                            <p className="text-xs text-primary-600 font-medium">{s.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-600">{s.department}</td>
                      <td className="table-cell">
                        <div className="space-y-0.5">
                          {email && (
                            <p className="text-sm text-gray-700 flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-400 shrink-0" />{email}
                            </p>
                          )}
                          {phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400 shrink-0" />{phone}
                            </p>
                          )}
                          {!email && !phone && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-600">{shiftLabel}</td>
                      <td className="table-cell">
                        <span className="text-sm font-semibold text-gray-900">
                          Rs {s.salary.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span>
                        </span>
                      </td>
                      <td className="table-cell"><StatusBadge status={s.status} /></td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1 pr-1">
                          <button onClick={() => setEditing(s)} title="Edit"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleting(s)} title="Remove"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!staff.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No staff members yet. Click <span className="font-medium text-primary-600">Add Staff Member</span> above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {staff.length > PER_PAGE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, staff.length)} of {staff.length} staff
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === safePage
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {adding && (
        <AddStaffModal
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); refresh() }}
        />
      )}

      {editing && (
        <EditStaffModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh() }}
        />
      )}

      {deleting && (
        <DeleteStaffModal
          member={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); refresh() }}
        />
      )}
    </>
  )
}
