'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Star, Pencil, Trash2, X, Loader2, Users, Mail, Phone } from 'lucide-react'

export interface GuestRecord {
  id: string
  user_id: string | null
  hotel_id: string
  name: string
  email: string
  phone: string
  country: string
  avatar_url: string | null
  passport_id: string
  notes: string
  is_vip: boolean
  stays: number
  is_manual: boolean
}

interface Props {
  initialGuests: GuestRecord[]
  tenantId: string
}

type GuestForm = {
  name: string; email: string; phone: string; country: string
  passport_id: string; notes: string; is_vip: boolean
}
type FormErrors = Partial<Record<keyof GuestForm, string>>

const EMPTY_FORM: GuestForm = {
  name: '', email: '', phone: '', country: '',
  passport_id: '', notes: '', is_vip: false,
}

function validateGuest(f: GuestForm): FormErrors {
  const errs: FormErrors = {}

  const name = f.name.trim()
  if (!name) errs.name = 'Name is required'
  else if (name.length < 2) errs.name = 'Name must be at least 2 characters'
  else if (name.length > 100) errs.name = 'Name cannot exceed 100 characters'
  else if (!/[a-zA-ZÀ-ɏ]/.test(name)) errs.name = 'Name must contain at least one letter'

  const email = f.email.trim()
  if (!email) errs.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'

  if (!f.phone) errs.phone = 'Phone number is required'
  else if (!/^\+92\d{10}$/.test(f.phone)) errs.phone = 'Phone must be exactly 10 digits after +92'

  const country = f.country.trim()
  if (!country) errs.country = 'Country is required'
  else if (!/^[a-zA-ZÀ-ɏ\s'\-.]+$/.test(country)) errs.country = 'Country name can only contain letters'

  return errs
}

function sanitizeName(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[<>@#$%^*+=[\]{}|;:,?!\\/'"0-9]/g, '')
}

function sanitizeEmail(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/[<>'"\\]/g, '')
}

function sanitizeId(value: string) {
  // Only allow alphanumeric, hyphens, spaces, dots — nothing else belongs in an ID
  return value.replace(/[^a-zA-Z0-9\s\-.]/g, '')
}

function sanitizeNotes(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
}

// Warm amber/gold palette matching the Aurelia Grand Admin Suite
const WARM_COLORS = [
  '#D97706', // amber-600  – primary warm gold
  '#B45309', // amber-700  – deep amber
  '#F59E0B', // amber-500  – light gold
  '#92400E', // amber-800  – rich brown-amber
  '#0D9488', // teal-600   – warm dark teal accent
  '#C2410C', // orange-700 – warm burnt orange
]

function avatarHex(seed: string): string {
  if (!seed) return WARM_COLORS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % WARM_COLORS.length
  return WARM_COLORS[hash]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const fi = 'w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-shadow'
const lbl = 'block text-xs font-semibold text-gray-500 mb-1.5'

export default function GuestsClient({ initialGuests, tenantId }: Props) {
  const router = useRouter()
  const [guests, setGuests] = useState<GuestRecord[]>(initialGuests)
  const [search, setSearch]     = useState('')
  const [vipOnly, setVipOnly]   = useState(false)
  const [modal, setModal]       = useState<'add' | 'edit' | 'delete' | null>(null)
  const [editing, setEditing]   = useState<GuestRecord | null>(null)
  const [form, setForm]         = useState<GuestForm>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return guests.filter(g => {
      if (vipOnly && !g.is_vip) return false
      if (!q) return true
      return (
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q) ||
        g.passport_id.toLowerCase().includes(q)
      )
    })
  }, [guests, search, vipOnly])

  const totalVIP = guests.filter(g => g.is_vip).length

  function openAdd() {
    setForm(EMPTY_FORM); setEditing(null); setModal('add')
  }
  function openEdit(g: GuestRecord) {
    setEditing(g)
    setForm({ name: g.name, email: g.email, phone: g.phone, country: g.country, passport_id: g.passport_id, notes: g.notes, is_vip: g.is_vip })
    setModal('edit')
  }
  function openDelete(g: GuestRecord) { setEditing(g); setModal('delete') }
  function closeModal() { setModal(null); setEditing(null); setForm(EMPTY_FORM); setFormErrors({}) }
  function setField<K extends keyof GuestForm>(k: K, v: GuestForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleAdd() {
    const errs = validateGuest(form)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('hotel_guests')
        .insert({
          hotel_id: tenantId,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          country: form.country.trim() || null,
          passport_id: form.passport_id.trim() || null,
          notes: form.notes.trim() || null,
          is_vip: form.is_vip,
        })
        .select()
        .single()
      if (error) { toast.error(error.message); return }
      setGuests(prev => [{
        id: (data as { id: string }).id,
        user_id: null, hotel_id: tenantId,
        name: form.name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), country: form.country.trim(),
        avatar_url: null, passport_id: form.passport_id.trim(),
        notes: form.notes.trim(), is_vip: form.is_vip,
        stays: 0, is_manual: true,
      }, ...prev])
      toast.success('Guest added')
      closeModal()
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!editing) return
    const errs = validateGuest(form)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const supabase = createClient()
      if (editing.is_manual) {
        const { error } = await supabase.from('hotel_guests').update({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          country: form.country.trim() || null,
          passport_id: form.passport_id.trim() || null,
          notes: form.notes.trim() || null,
          is_vip: form.is_vip,
        }).eq('id', editing.id)
        if (error) { toast.error(error.message); return }
      } else {
        // Upsert hotel_guests for this profile-linked guest
        const { data: existing } = await supabase
          .from('hotel_guests')
          .select('id')
          .eq('hotel_id', tenantId)
          .eq('user_id', editing.user_id!)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase.from('hotel_guests').update({
            passport_id: form.passport_id.trim() || null,
            notes: form.notes.trim() || null,
            is_vip: form.is_vip,
          }).eq('id', (existing as { id: string }).id)
          if (error) { toast.error(error.message); return }
        } else {
          const { error } = await supabase.from('hotel_guests').insert({
            hotel_id: tenantId, user_id: editing.user_id,
            name: editing.name,
            passport_id: form.passport_id.trim() || null,
            notes: form.notes.trim() || null,
            is_vip: form.is_vip,
          })
          if (error) { toast.error(error.message); return }
        }
      }

      setGuests(prev => prev.map(g => g.id !== editing.id ? g : {
        ...g,
        name:        editing.is_manual ? form.name.trim()    : g.name,
        email:       editing.is_manual ? form.email.trim()   : g.email,
        phone:       editing.is_manual ? form.phone.trim()   : g.phone,
        country:     editing.is_manual ? form.country.trim() : g.country,
        passport_id: form.passport_id.trim(),
        notes:       form.notes.trim(),
        is_vip:      form.is_vip,
      }))
      toast.success('Guest updated')
      closeModal()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing) return
    setSaving(true)
    try {
      const supabase = createClient()
      if (editing.is_manual) {
        const { error } = await supabase.from('hotel_guests').delete().eq('id', editing.id)
        if (error) { toast.error(error.message); return }
      } else {
        const { data: existing } = await supabase
          .from('hotel_guests')
          .select('id')
          .eq('hotel_id', tenantId)
          .eq('user_id', editing.user_id!)
          .maybeSingle()
        if (existing) {
          await supabase.from('hotel_guests').delete().eq('id', (existing as { id: string }).id)
        }
      }
      setGuests(prev => prev.filter(g => g.id !== editing.id))
      toast.success('Guest removed')
      closeModal()
      router.refresh()
    } finally { setSaving(false) }
  }

  async function handleToggleVip(guest: GuestRecord) {
    const newVip = !guest.is_vip
    const supabase = createClient()
    if (guest.is_manual) {
      const { error } = await supabase.from('hotel_guests').update({ is_vip: newVip }).eq('id', guest.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { data: existing } = await supabase
        .from('hotel_guests').select('id')
        .eq('hotel_id', tenantId).eq('user_id', guest.user_id!).maybeSingle()
      if (existing) {
        const { error } = await supabase.from('hotel_guests').update({ is_vip: newVip }).eq('id', (existing as { id: string }).id)
        if (error) { toast.error(error.message); return }
      } else {
        const { error } = await supabase.from('hotel_guests').insert({
          hotel_id: tenantId, user_id: guest.user_id, name: guest.name, is_vip: newVip,
        })
        if (error) { toast.error(error.message); return }
      }
    }
    setGuests(prev => prev.map(g => g.id !== guest.id ? g : { ...g, is_vip: newVip }))
    toast.success(newVip ? 'Marked as VIP' : 'VIP status removed')
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Guest Directory</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {guests.length} registered guest{guests.length !== 1 ? 's' : ''}
            {totalVIP > 0 && (
              <> · <span className="text-amber-600 font-semibold">{totalVIP} VIP</span></>
            )}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-sm transition-colors shadow-sm shadow-primary-200"
        >
          <Plus className="h-4 w-4" /> Add Guest
        </button>
      </div>

      {/* ── Search + VIP filter ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guests, email, country…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <button
          onClick={() => setVipOnly(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            vipOnly
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Star className={`h-4 w-4 ${vipOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
          VIP Only
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Guest', 'Contact', 'Country', 'ID / Passport', 'Stays', 'Notes', 'Actions'].map((col, i) => (
                  <th
                    key={col}
                    className={`text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] px-5 py-3.5 ${i === 6 ? 'text-right' : 'text-left'}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">
                      {search || vipOnly ? 'No guests match your filter' : 'No guests yet'}
                    </p>
                    {!search && !vipOnly && (
                      <p className="text-xs text-gray-300 mt-1">
                        Guests appear automatically once they make a booking, or add them manually.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(guest => (
                  <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors">

                    {/* GUEST */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden select-none"
                          style={{ backgroundColor: guest.avatar_url ? undefined : avatarHex(guest.email || guest.name) }}
                        >
                          {guest.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={guest.avatar_url} alt="" className="h-full w-full object-cover" />
                            : initials(guest.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{guest.name}</span>
                            {guest.is_vip && (
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          {guest.is_vip && (
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-none">
                              VIP Guest
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-4 py-3.5 space-y-1">
                      <p className="flex items-center gap-1.5 text-xs text-gray-700 truncate max-w-[180px]">
                        <Mail className="h-3 w-3 text-gray-300 shrink-0" />
                        {guest.email || <span className="text-gray-300">—</span>}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Phone className="h-3 w-3 text-gray-300 shrink-0" />
                        {guest.phone || <span className="text-gray-300">—</span>}
                      </p>
                    </td>

                    {/* COUNTRY */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700">{guest.country || '—'}</span>
                    </td>

                    {/* ID / PASSPORT */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-gray-500 tracking-wide">
                        {guest.passport_id || '—'}
                      </span>
                    </td>

                    {/* STAYS */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700">
                        {guest.stays > 0 ? `${guest.stays} stay${guest.stays !== 1 ? 's' : ''}` : '—'}
                      </span>
                    </td>

                    {/* NOTES */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-xs text-gray-400 italic truncate" title={guest.notes}>
                        {guest.notes || '—'}
                      </p>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleVip(guest)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            guest.is_vip
                              ? 'text-amber-400 hover:bg-amber-50'
                              : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'
                          }`}
                          title={guest.is_vip ? 'Remove VIP status' : 'Mark as VIP'}
                        >
                          <Star className={`h-3.5 w-3.5 ${guest.is_vip ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => openEdit(guest)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit guest"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDelete(guest)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove guest"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">
                {modal === 'add' ? 'Add Guest' : 'Edit Guest'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => { setField('name', sanitizeName(e.target.value)); setFormErrors(p => ({ ...p, name: undefined })) }}
                    readOnly={modal === 'edit' && !editing?.is_manual}
                    maxLength={100}
                    className={`${fi} ${modal === 'edit' && !editing?.is_manual ? 'bg-gray-50 text-gray-500 cursor-default' : formErrors.name ? 'border-red-300 focus:ring-red-300' : ''}`}
                    placeholder="Olivia Bennett"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input
                    value={form.email}
                    onChange={e => { setField('email', sanitizeEmail(e.target.value)); setFormErrors(p => ({ ...p, email: undefined })) }}
                    readOnly={modal === 'edit' && !editing?.is_manual}
                    className={`${fi} ${modal === 'edit' && !editing?.is_manual ? 'bg-gray-50 text-gray-500 cursor-default' : formErrors.email ? 'border-red-300 focus:ring-red-300' : ''}`}
                    placeholder="guest@email.com"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className={lbl}>Phone *</label>
                  <div className={`flex overflow-hidden rounded-xl border transition-shadow ${
                    modal === 'edit' && !editing?.is_manual
                      ? 'border-gray-200 bg-gray-50'
                      : formErrors.phone
                        ? 'border-red-300 bg-white focus-within:ring-2 focus-within:ring-red-300'
                        : 'border-gray-200 bg-white focus-within:ring-2 focus-within:ring-amber-300 focus-within:border-transparent'
                  }`}>
                    <span className="flex items-center px-3 text-sm font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 select-none flex-shrink-0">
                      +92
                    </span>
                    <input
                      value={form.phone.startsWith('+92') ? form.phone.slice(3) : ''}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setField('phone', digits ? '+92' + digits : '')
                        setFormErrors(p => ({ ...p, phone: undefined }))
                      }}
                      readOnly={modal === 'edit' && !editing?.is_manual}
                      inputMode="numeric"
                      maxLength={10}
                      className={`flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none ${
                        modal === 'edit' && !editing?.is_manual
                          ? 'text-gray-500 cursor-default'
                          : 'text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="3001234567"
                    />
                  </div>
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className={lbl}>Country *</label>
                  <input
                    value={form.country}
                    onChange={e => {
                      // Only allow letters, spaces, hyphens, apostrophes, periods
                      const val = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'\-.]/g, '')
                      setField('country', val)
                      setFormErrors(p => ({ ...p, country: undefined }))
                    }}
                    readOnly={modal === 'edit' && !editing?.is_manual}
                    maxLength={60}
                    className={`${fi} ${modal === 'edit' && !editing?.is_manual ? 'bg-gray-50 text-gray-500 cursor-default' : formErrors.country ? 'border-red-300 focus:ring-red-300' : ''}`}
                    placeholder="United States"
                  />
                  {formErrors.country && <p className="text-red-500 text-xs mt-1">{formErrors.country}</p>}
                </div>
                <div>
                  <label className={lbl}>Passport / ID</label>
                  <input
                    value={form.passport_id}
                    onChange={e => setField('passport_id', sanitizeId(e.target.value))}
                    maxLength={50}
                    className={`${fi} font-mono`}
                    placeholder="US-1234-5678"
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', sanitizeNotes(e.target.value))}
                  rows={2}
                  maxLength={500}
                  className={`${fi} resize-none`}
                  placeholder="Special requests, preferences…"
                />
              </div>

              {/* VIP toggle */}
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setField('is_vip', !form.is_vip)}
              >
                <div className={`relative w-10 h-5 rounded-full transition-colors ${form.is_vip ? 'bg-amber-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_vip ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Mark as VIP Guest</span>
                {form.is_vip && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
              </div>

              {modal === 'edit' && !editing?.is_manual && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
                  Name, email, phone and country come from the guest&apos;s profile and can&apos;t be edited here.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={modal === 'add' ? handleAdd : handleEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {modal === 'add' ? 'Add Guest' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {modal === 'delete' && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Remove Guest?</h3>
            <p className="text-sm text-gray-500 mt-1.5">
              This will remove <strong>{editing.name}</strong> from your guest directory.
              {!editing.is_manual && ' Their booking history remains intact.'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
