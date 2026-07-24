'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Search, DoorOpen, Phone, MessageCircle, Globe,
  Pencil, Trash2, Loader2, X, AlertTriangle, Calendar,
  Users, Moon, Eye,
} from 'lucide-react'
import BookingActions from './BookingActions'
import { formatCurrency } from '@/lib/currency'
import PhoneInput from '@/components/ui/PhoneInput'

// ── Types ──────────────────────────────────────────────────────────
export type RoomOption = {
  id: string
  room_number: string
  name: string | null
  price_per_night: number
  max_adults: number
  max_children: number
  capacity: number
  room_type: { name?: string } | null
}

type BookingRoom = { id: string; room_number: string; name: string | null; price_per_night: number; capacity: number; room_type: { name?: string } | null }
type Booking = {
  id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number
  source: string
  adults: number
  children: number
  special_requests: string | null
  guest_name: string | null
  guest_phone: string | null
  room_ids: string[] | null
  user: { full_name?: string; email?: string } | null
  room: BookingRoom | null
}

// ── Config ─────────────────────────────────────────────────────────
const STATUS_TABS = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

const SOURCES = [
  { value: 'walk_in',  label: 'Walk-in',  icon: DoorOpen,      cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         cls: 'text-blue-600 bg-blue-50 border-blue-200'       },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, cls: 'text-green-600 bg-green-50 border-green-200'    },
  { value: 'online',   label: 'Online',   icon: Globe,         cls: 'text-purple-600 bg-purple-50 border-purple-200' },
]

const avatarColor = (name: string) => {
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']
  return colors[(name.charCodeAt(0) ?? 0) % colors.length]
}

const calcNights = (ci: string, co: string) =>
  Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Edit Modal ─────────────────────────────────────────────────────
function EditBookingModal({ booking, currency, onClose, onSaved }: {
  booking: Booking
  currency: string
  onClose: () => void
  onSaved: () => void
}) {
  const isOffline = !booking.user

  const [checkIn,    setCheckIn]    = useState(booking.check_in.slice(0, 10))
  const [checkOut,   setCheckOut]   = useState(booking.check_out.slice(0, 10))
  const [adults,     setAdults]     = useState(booking.adults)
  const [children,   setChildren]   = useState(booking.children)
  const [source,     setSource]     = useState(booking.source ?? 'walk_in')
  const [guestName,  setGuestName]  = useState(booking.guest_name ?? '')
  const [guestPhone, setGuestPhone] = useState(booking.guest_phone ?? '')
  const [notes,      setNotes]      = useState(booking.special_requests ?? '')
  const [saving,     setSaving]     = useState(false)

  const pricePerNight = booking.room?.price_per_night ?? 0
  const n = checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
    ? calcNights(checkIn, checkOut) : 0
  const newTotal = n * pricePerNight

  const save = async () => {
    if (!checkIn || !checkOut) { toast.error('Please set both check-in and check-out dates'); return }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return }

    setSaving(true)
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        source,
        special_requests: notes || null,
        ...(isOffline ? { guest_name: guestName || null, guest_phone: guestPhone || null } : {}),
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update booking'); return }
    toast.success('Booking updated')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Booking</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {booking.user?.full_name ?? booking.guest_name ?? 'Guest'}
              {booking.room && (
                <span className="ml-1.5 text-gray-400">
                  · {booking.room.name ?? `Room ${booking.room.room_number}`}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Guest Info (offline only) */}
          {isOffline && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Full Name</label>
                  <input value={guestName} onChange={e => setGuestName(e.target.value)}
                    className="input" placeholder="John Smith" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <PhoneInput value={guestPhone} onChange={setGuestPhone} className="w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check-in</label>
                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} className="input" />
              </div>
            </div>
            {n > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700">
                <span className="flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5" />
                  <strong>{n}</strong> night{n !== 1 ? 's' : ''}
                </span>
                {newTotal > 0 && <span className="font-bold">{formatCurrency(newTotal, currency)}</span>}
              </div>
            )}
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Adults</label>
                <input type="number" value={adults} onChange={e => setAdults(Number(e.target.value))}
                  min={1} max={20} className="input" />
              </div>
              <div>
                <label className="label">Children</label>
                <input type="number" value={children} onChange={e => setChildren(Number(e.target.value))}
                  min={0} max={20} className="input" />
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Source</p>
            <div className="grid grid-cols-4 gap-2">
              {SOURCES.map(s => {
                const Icon = s.icon
                const active = source === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSource(s.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      active ? `${s.cls} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Special Requests <span className="normal-case text-gray-400 font-normal">(optional)</span>
            </p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} className="input resize-none" placeholder="Any special requests, preferences, or notes…" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────
function DeleteConfirmModal({ booking, onClose, onDeleted }: {
  booking: Booking; onClose: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    setDeleting(true)
    const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete booking'); return }
    toast.success('Booking deleted')
    onDeleted()
  }

  const guest = booking.user?.full_name ?? booking.guest_name ?? 'Guest'

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
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Booking?</h3>
        <p className="text-sm text-gray-500 text-center mb-1">
          <span className="font-semibold text-gray-700">{guest}</span>
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">
          {fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}
          <br />
          <span className="text-xs">This cannot be undone.</span>
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={del} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function BookingsClient({
  bookings: initial,
  currency,
  rooms,
}: {
  bookings: Booking[]
  currency: string
  rooms: RoomOption[]
}) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initial)
  const [statusTab, setStatusTab] = useState('all')
  const [q, setQ]                 = useState('')
  const [editing, setEditing]     = useState<Booking | null>(null)
  const [deleting, setDeleting]   = useState<Booking | null>(null)

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return bookings.filter(b => {
      if (statusTab !== 'all' && b.status !== statusTab) return false
      if (lq) {
        const guest = (b.user?.full_name ?? b.guest_name ?? '').toLowerCase()
        const phone = (b.user?.email ?? b.guest_phone ?? '').toLowerCase()
        const room  = (b.room?.room_number ?? '').toLowerCase()
        if (!guest.includes(lq) && !phone.includes(lq) && !room.includes(lq)) return false
      }
      return true
    })
  }, [bookings, statusTab, q])

  const counts = useMemo(() => ({
    pending:    bookings.filter(b => b.status === 'pending').length,
    confirmed:  bookings.filter(b => b.status === 'confirmed').length,
    checked_in: bookings.filter(b => b.status === 'checked_in').length,
  }), [bookings])

  const refresh = () => router.refresh()

  const onSaved = () => {
    setEditing(null)
    refresh()
  }

  const onDeleted = () => {
    if (deleting) setBookings(bs => bs.filter(b => b.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
            <p className="text-gray-500 text-sm mt-1">{bookings.length} total</p>
          </div>
          <Link href="/hotel-admin/bookings/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> New Booking
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending',    count: counts.pending,    color: 'bg-amber-50 text-amber-700 border-amber-200'      },
            { label: 'Confirmed',  count: counts.confirmed,  color: 'bg-blue-50 text-blue-700 border-blue-200'         },
            { label: 'Checked In', count: counts.checked_in, color: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search guest, phone, room…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab === 'all' ? 'All' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Guest</th>
                  <th className="table-header">Room</th>
                  <th className="table-header">Stay</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(b => {
                  const guest    = b.user?.full_name ?? b.guest_name ?? 'Guest'
                  const contact  = b.user?.email ?? b.guest_phone ?? ''
                  const initial  = guest.charAt(0).toUpperCase()
                  const n        = calcNights(b.check_in, b.check_out)
                  const srcObj   = SOURCES.find(s => s.value === b.source) ?? SOURCES[0]
                  const SrcIcon  = srcObj.icon
                  const roomName = b.room?.name ?? `Room ${b.room?.room_number}`
                  const typeName = (b.room?.room_type as { name?: string } | null)?.name

                  return (
                    <tr
                      key={b.id}
                      onClick={() => router.push(`/hotel-admin/bookings/${b.id}`)}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >

                      {/* Guest */}
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(guest)}`}>
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{guest}</p>
                            {contact && <p className="text-xs text-gray-400 mt-0.5">{contact}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="table-cell">
                        <p className="text-sm font-medium text-gray-900">{roomName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {typeName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                              {typeName}
                            </span>
                          )}
                          {b.room_ids && b.room_ids.length > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-600">
                              +{b.room_ids.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stay */}
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>{fmtDate(b.check_in)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                          <Moon className="h-3 w-3 flex-shrink-0" />
                          <span>{n} night{n !== 1 ? 's' : ''} · out {fmtDate(b.check_out)}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${srcObj.cls}`}>
                          <SrcIcon className="h-3 w-3" />
                          {srcObj.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="table-cell">
                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(b.total_amount, currency)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <Users className="h-2.5 w-2.5 inline mr-0.5" />
                          {b.adults + b.children} guest{b.adults + b.children !== 1 ? 's' : ''}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="table-cell">
                        <span className={`${statusBadge[b.status] ?? 'badge-gray'} capitalize`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1 pr-1" onClick={e => e.stopPropagation()}>
                          <Link
                            href={`/hotel-admin/bookings/${b.id}`}
                            title="View booking"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => setEditing(b)}
                            title="Edit booking"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(b)}
                            title="Delete booking"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <BookingActions
                            bookingId={b.id}
                            currentStatus={b.status}
                            onStatusChange={newStatus =>
                              setBookings(bs =>
                                bs.map(bk => bk.id === b.id ? { ...bk, status: newStatus } : bk)
                              )
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Calendar className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        {q || statusTab !== 'all' ? 'No bookings match your filters.' : 'No bookings yet.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <EditBookingModal
          booking={editing}
          currency={currency}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          booking={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}
