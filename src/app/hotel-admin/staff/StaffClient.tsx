'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  User, Pencil, Trash2, Loader2, X, AlertTriangle, Power,
} from 'lucide-react'
import { DEPARTMENTS } from '@/lib/staff-constants'
import PhoneInput from '@/components/ui/PhoneInput'

const STAFF_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
]

export type StaffMember = {
  id: string
  department: string
  position: string
  permissions: string[]
  is_active: boolean
  user_id: string
  user: { full_name?: string | null; email?: string | null; phone?: string | null } | null
}

const label = (s: StaffMember) =>
  s.user?.full_name?.trim() || s.user?.email?.trim() || 'Staff member'

// ── Edit modal ───────────────────────────────────────────────────────
function EditStaffModal({ member, onClose, onSaved }: {
  member: StaffMember
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName,   setFullName]   = useState(member.user?.full_name ?? '')
  const [phone,      setPhone]      = useState(member.user?.phone ?? '')
  const [department, setDepartment] = useState(member.department)
  const [position,   setPosition]   = useState(member.position)
  const [permissions, setPermissions] = useState<string[]>(member.permissions ?? [])
  const [isActive,   setIsActive]   = useState(member.is_active)
  const [saving,     setSaving]     = useState(false)

  const toggle = (perm: string) =>
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])

  const save = async () => {
    if (!position.trim()) { toast.error('Position is required'); return }
    if (!permissions.length) { toast.error('Give the staff member at least one permission'); return }

    setSaving(true)
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        phone: phone || null,
        department,
        position,
        permissions,
        is_active: isActive,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update staff member'); return }
    toast.success('Staff member updated')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Staff Member</h3>
            <p className="text-xs text-gray-500 mt-0.5">{member.user?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, ''))}
                className="input"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <PhoneInput value={phone} onChange={setPhone} className="w-full" />
            </div>
            <div>
              <label className="label">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="input">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Position</label>
              <input
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="input"
                placeholder="Receptionist"
              />
            </div>
          </div>

          <div>
            <label className="label">Permissions</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {STAFF_PERMISSIONS.map(perm => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => toggle(perm)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-gray-900">Active</span>
              <span className="block text-xs text-gray-500">
                Inactive members keep their account but lose access to the dashboard.
              </span>
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
          </label>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ───────────────────────────────────────────────────
function DeleteStaffModal({ member, onClose, onDeleted }: {
  member: StaffMember
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    setDeleting(true)
    const res = await fetch(`/api/admin/staff/${member.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to remove staff member'); return }
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
        <p className="text-sm text-gray-500 text-center mb-1">
          <span className="font-semibold text-gray-700">{label(member)}</span>
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">
          {member.position} · {member.department}
          <br />
          <span className="text-xs">
            Their login is deleted and they lose access immediately. To keep the account,
            set them to inactive instead.
          </span>
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

// ── Table ────────────────────────────────────────────────────────────
export default function StaffClient({ staff }: { staff: StaffMember[] }) {
  const router = useRouter()
  const [editing,  setEditing]  = useState<StaffMember | null>(null)
  const [deleting, setDeleting] = useState<StaffMember | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const refresh = () => router.refresh()

  const toggleActive = async (member: StaffMember) => {
    setTogglingId(member.id)
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !member.is_active }),
    })
    const json = await res.json().catch(() => ({}))
    setTogglingId(null)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update staff member'); return }
    toast.success(member.is_active ? 'Staff member deactivated' : 'Staff member activated')
    refresh()
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">Member</th>
                <th className="table-header">Department</th>
                <th className="table-header">Position</th>
                <th className="table-header">Permissions</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">
                        {label(s)[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{label(s)}</p>
                        <p className="text-xs text-gray-500">{s.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{s.department}</td>
                  <td className="table-cell text-gray-500">{s.position}</td>
                  <td className="table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {(s.permissions ?? []).slice(0, 2).map(p => (
                        <span key={p} className="badge-gray text-xs">{p}</span>
                      ))}
                      {(s.permissions ?? []).length > 2 && (
                        <span className="badge-gray text-xs">+{s.permissions.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1 pr-1">
                      <button
                        onClick={() => setEditing(s)}
                        title="Edit staff member"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={togglingId === s.id}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 ${
                          s.is_active
                            ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {togglingId === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Power className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        title="Remove staff member"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!staff.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No staff match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
