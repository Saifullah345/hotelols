'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Search, DoorOpen, Phone, MessageCircle, Globe,
  Pencil, Trash2, Loader2, X, AlertTriangle, Calendar,
  Users, Moon, Eye, Clock, BadgeCheck, BedDouble, ChevronLeft, ChevronRight,
} from 'lucide-react'
import BookingActions from './BookingActions'
import { formatCurrency } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { groupByStay, stayKey, distributeGuests, assignRoomsToRows, roomSetChanged } from '@/lib/booking'
import { guestLabel, guestContact } from '@/lib/guest'
import GuestAvatar from '@/components/admin/GuestAvatar'
import RoomPicker from '@/components/admin/RoomPicker'
import { DATE_RANGES, resolveDateWindow, inWindow } from '@/lib/dateRange'
import DateRangeChips from '@/components/admin/DateRangeChips'
import Pagination from '@/components/admin/Pagination'
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
  created_at: string
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
  user_id: string | null
  room_ids: string[] | null
  user: { full_name?: string; email?: string; avatar_url?: string | null } | null
  room: BookingRoom | null
}

/**
 * One row per stay, not per room. Rooms booked together share a single booking
 * row now, but older reservations put each room on its own row — the same guest,
 * hotel, dates and status is one booking as far as the desk is concerned.
 */
type Stay = {
  key: string
  bookings: Booking[]
  primary: Booking
  roomCount: number
  roomNames: string[]
  total: number
  adults: number
  children: number
}

function toStays(list: Booking[]): Stay[] {
  return groupByStay(list).map(bookings => ({
    key:       stayKey(bookings[0]),
    bookings,
    primary:   bookings[0],
    // A row can itself hold several rooms; only its primary room is embedded,
    // so the names are what we can show and the count is what's really booked.
    roomCount: bookings.reduce((s, b) => s + Math.max(1, b.room_ids?.length ?? 1), 0),
    roomNames: bookings.map(b => b.room?.name ?? `Room ${b.room?.room_number ?? '—'}`),
    total:     bookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0),
    adults:    bookings.reduce((s, b) => s + (b.adults ?? 0), 0),
    children:  bookings.reduce((s, b) => s + (b.children ?? 0), 0),
  }))
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


const calcNights = (ci: string, co: string) =>
  Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Edit Modal ─────────────────────────────────────────────────────
function EditBookingModal({ stay, currency, rooms, allBookings, onClose, onSaved }: {
  stay: Stay
  currency: string
  rooms: RoomOption[]
  allBookings: Booking[]
  onClose: () => void
  onSaved: () => void
}) {
  const booking = stay.primary
  const isOffline = !booking.user

  // Every room across the stay, in booking order. A row can hold several rooms
  // while embedding only its primary one, so the ids come from `room_ids`.
  const originalRoomIds = useMemo(
    () => stay.bookings.flatMap(b => (b.room_ids?.length ? b.room_ids : b.room ? [b.room.id] : [])),
    [stay],
  )

  const [checkIn,    setCheckIn]    = useState(booking.check_in.slice(0, 10))
  const [checkOut,   setCheckOut]   = useState(booking.check_out.slice(0, 10))
  const [roomIds,    setRoomIds]    = useState<string[]>(originalRoomIds)
  const [adults,     setAdults]     = useState(stay.adults)
  const [children,   setChildren]   = useState(stay.children)
  const [source,     setSource]     = useState(booking.source ?? 'walk_in')
  const [guestName,  setGuestName]  = useState(booking.guest_name ?? '')
  const [guestPhone, setGuestPhone] = useState(booking.guest_phone ?? '')
  const [notes,      setNotes]      = useState(booking.special_requests ?? '')
  const [saving,     setSaving]     = useState(false)

  const roomById = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms])
  const chosen   = roomIds.map(id => roomById.get(id)).filter(Boolean) as RoomOption[]

  // Rooms held by someone else over the chosen nights can't be offered. The API
  // re-checks this, so a stale list here can only be conservative.
  const stayIds  = useMemo(() => new Set(stay.bookings.map(b => b.id)), [stay])
  const takenIds = useMemo(() => {
    const taken = new Set<string>()
    if (!checkIn || !checkOut) return taken
    for (const b of allBookings) {
      if (stayIds.has(b.id)) continue
      if (!['pending', 'confirmed', 'checked_in'].includes(b.status)) continue
      if (!(b.check_in < checkOut && b.check_out > checkIn)) continue
      for (const rid of (b.room_ids?.length ? b.room_ids : b.room ? [b.room.id] : [])) taken.add(rid)
    }
    return taken
  }, [allBookings, stayIds, checkIn, checkOut])

  // Priced off what's actually selected, so swaps and removals show immediately.
  const pricePerNight = chosen.reduce((s, r) => s + Number(r.price_per_night ?? 0), 0)
  const n = checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
    ? calcNights(checkIn, checkOut) : 0
  const newTotal = n * pricePerNight

  const roomsChanged = roomSetChanged(roomIds, originalRoomIds)

  const save = async () => {
    if (!checkIn || !checkOut) { toast.error('Please set both check-in and check-out dates'); return }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return }
    if (!roomIds.length) { toast.error('Keep at least one room, or delete the booking'); return }

    // Rooms are edited as one pool, then mapped back onto the rows they came from.
    const ownRoomsOf = (b: Booking) => b.room_ids?.length ? b.room_ids : b.room ? [b.room.id] : []
    const rowRooms   = assignRoomsToRows(stay.bookings.map(ownRoomsOf), roomIds)

    if (!rowRooms.some(list => list.length)) {
      toast.error('Keep at least one room, or delete the booking'); return
    }

    // Guest counts are per row. Only redistribute them when the desk actually
    // changed the total — otherwise each room keeps the party it was booked for.
    const adultsTouched   = adults   !== stay.adults
    const childrenTouched = children !== stay.children
    const surviving = stay.bookings.filter((_, i) => rowRooms[i].length > 0)
    const caps = surviving.map((_, i) => {
      const list = rowRooms[stay.bookings.indexOf(surviving[i])]
      const cap = list.reduce((s, id) => s + (roomById.get(id)?.capacity ?? 0), 0)
      return cap > 0 ? cap : Number.MAX_SAFE_INTEGER
    })
    const adultSplit = adultsTouched   ? distributeGuests(adults, caps, 1)   : []
    const childSplit = childrenTouched ? distributeGuests(children, caps, 0) : []

    setSaving(true)
    let saved = 0
    let survivorIndex = 0

    for (const [i, b] of stay.bookings.entries()) {
      // A row that lost every room has nothing left to hold.
      if (!rowRooms[i].length) {
        const res = await fetch(`/api/bookings/${b.id}`, { method: 'DELETE' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setSaving(false)
          toast.error(json.error ?? 'Failed to remove the room')
          if (saved) onSaved()
          return
        }
        saved++
        continue
      }

      const j = survivorIndex++
      const ownChanged = roomSetChanged(rowRooms[i], ownRoomsOf(b))

      const res = await fetch(`/api/bookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          ...(ownChanged      ? { room_ids: rowRooms[i] } : {}),
          ...(adultsTouched   ? { adults:   adultSplit[j] } : {}),
          ...(childrenTouched ? { children: childSplit[j] } : {}),
          source,
          special_requests: notes || null,
          ...(isOffline ? { guest_name: guestName || null, guest_phone: guestPhone || null } : {}),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaving(false)
        toast.error(json.error ?? 'Failed to update booking')
        if (saved) onSaved()   // keep whatever already saved on screen
        return
      }
      saved++
    }
    setSaving(false)
    toast.success(roomIds.length > 1 ? `Booking updated · ${roomIds.length} rooms` : 'Booking updated')
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
              {guestLabel(booking)}
              <span className="ml-1.5 text-gray-400">
                · {stay.roomCount > 1
                    ? `${stay.roomCount} rooms`
                    : (booking.room?.name ?? `Room ${booking.room?.room_number ?? '—'}`)}
              </span>
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
                  <input value={guestName} onChange={e => setGuestName(e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, ''))}
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

          {/* Rooms — remove, swap or add */}
          <RoomPicker
            rooms={rooms}
            selected={roomIds}
            taken={takenIds}
            currency={currency}
            onChange={setRoomIds}
            changed={roomsChanged}
          />

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
function DeleteConfirmModal({ stay, onClose, onDeleted }: {
  stay: Stay; onClose: () => void; onDeleted: () => void
}) {
  const booking = stay.primary
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    setDeleting(true)
    // A stay spread over several rows is deleted as a whole — leaving one row
    // behind would resurrect it as a phantom one-room booking.
    for (const b of stay.bookings) {
      const res = await fetch(`/api/bookings/${b.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleting(false)
        toast.error(json.error ?? 'Failed to delete booking')
        return
      }
    }
    setDeleting(false)
    toast.success(stay.bookings.length > 1 ? `Booking deleted · ${stay.roomCount} rooms` : 'Booking deleted')
    onDeleted()
  }

  const guest = guestLabel(booking)

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
          {stay.roomCount > 1 && (
            <span className="text-xs font-medium text-gray-600">
              All {stay.roomCount} rooms on this booking will be deleted.
              <br />
            </span>
          )}
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
  today: serverToday,
}: {
  bookings: Booking[]
  currency: string
  rooms: RoomOption[]
  today: string
}) {
  const router = useRouter()
  // The server's date keeps the first paint identical for hydration; the
  // viewer's own date takes over on mount, so "Today" means their today even
  // when the server runs in a different timezone.
  const [today, setToday] = useState(serverToday)
  useEffect(() => { setToday(todayISO()) }, [])

  const [bookings, setBookings] = useState(initial)
  const [statusTab, setStatusTab] = useState('all')
  // Today's arrivals are what staff need first thing; older bookings are one
  // click away on the range chips.
  const [dateRange, setDateRange] = useState('today')
  const [q, setQ]                 = useState('')
  const [editingKey, setEditingKey]   = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  const bookedOnOrAfter = (b: Booking, from: number) =>
    new Date(b.created_at).getTime() >= from

  // Window of "booked on" dates the current filter accepts.
  const bookedWindow = useMemo(
    () => resolveDateWindow(dateRange, today, customFrom, customTo),
    [dateRange, today, customFrom, customTo],
  )

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return bookings
      .filter(b => {
        if (statusTab !== 'all' && b.status !== statusTab) return false
        if (!inWindow(b.created_at, bookedWindow)) return false
        if (lq) {
          const guest = guestLabel(b).toLowerCase()
          const phone = `${b.user?.email ?? ''} ${b.guest_phone ?? ''}`.toLowerCase()
          const room  = (b.room?.room_number ?? '').toLowerCase()
          if (!guest.includes(lq) && !phone.includes(lq) && !room.includes(lq)) return false
        }
        return true
      })
      // Newest booking first, whatever the filter — the default view is "what
      // came in most recently".
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [bookings, statusTab, bookedWindow, q])

  // Rooms booked for the same guest, dates and status are one reservation on
  // the list — grouped after filtering so a filter can't split a stay in half.
  const stays = useMemo(() => toStays(filtered), [filtered])

  // ── Pagination ────────────────────────────────────────────────────
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Any filter change puts you back on the first page
  useEffect(() => { setPage(1) }, [q, statusTab, dateRange, customFrom, customTo, perPage])

  // Clamp instead of storing — the list can shrink under us (delete + refresh)
  const safePage = Math.min(page, Math.max(1, Math.ceil(stays.length / perPage)))
  const paged    = stays.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage)

  const editingStay  = stays.find(s => s.key === editingKey)  ?? null
  const deletingStay = stays.find(s => s.key === deletingKey) ?? null

  // Every count on screen is in stays too, so the chips agree with the rows.
  const allStays = useMemo(() => toStays(bookings), [bookings])

  // Counts shown on each range chip, so the volume is visible before clicking.
  const rangeCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of DATE_RANGES) {
      const w = resolveDateWindow(r.key, today)
      out[r.key] = allStays.filter(s => inWindow(s.primary.created_at, w)).length
    }
    return out
  }, [allStays, today])

  const startOfToday = useMemo(() => new Date(`${today}T00:00:00`).getTime(), [today])

  const counts = useMemo(() => ({
    pending:    allStays.filter(s => s.primary.status === 'pending').length,
    confirmed:  allStays.filter(s => s.primary.status === 'confirmed').length,
    checked_in: allStays.filter(s => s.primary.status === 'checked_in').length,
    today:      allStays.filter(s => bookedOnOrAfter(s.primary, startOfToday)).length,
  }), [allStays, startOfToday])

  const refresh = () => router.refresh()

  const onSaved = () => {
    setEditingKey(null)
    refresh()
  }

  const onDeleted = () => {
    if (deletingStay) {
      const gone = new Set(deletingStay.bookings.map(b => b.id))
      setBookings(bs => bs.filter(b => !gone.has(b.id)))
    }
    setDeletingKey(null)
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-5 sm:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white leading-tight">Bookings</h2>
              <p className="text-indigo-300 text-sm mt-0.5">{allStays.length} total reservations</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Booked today — clicking it jumps straight to that filter. */}
              <button
                type="button"
                onClick={() => { setDateRange(dateRange === 'today' ? 'all' : 'today'); setStatusTab('all') }}
                title="Show bookings made today"
                className={`flex items-center gap-2 backdrop-blur px-3.5 py-2 rounded-xl text-sm transition-colors ${
                  dateRange === 'today' ? 'bg-white text-indigo-700' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Calendar className={`h-4 w-4 ${dateRange === 'today' ? 'text-indigo-600' : 'text-sky-300'}`} />
                <div className="text-left">
                  <p className={`font-bold leading-none ${dateRange === 'today' ? 'text-indigo-700' : 'text-white'}`}>{counts.today}</p>
                  <p className={`text-xs leading-none mt-0.5 ${dateRange === 'today' ? 'text-indigo-500' : 'text-indigo-300'}`}>Booked Today</p>
                </div>
              </button>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <Clock className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-white font-bold leading-none">{counts.pending}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <BadgeCheck className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-white font-bold leading-none">{counts.confirmed}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Confirmed</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <BedDouble className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-white font-bold leading-none">{counts.checked_in}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Checked In</p>
                </div>
              </div>
              <Link href="/hotel-admin/bookings/new" className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                <Plus className="h-4 w-4" /> New Booking
              </Link>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="card px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search guest, phone, room…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Booked-on filter — today through the last 10 days */}
          <div className="border-t border-gray-100 pt-3">
            <DateRangeChips
              label="Booked"
              value={dateRange}
              onChange={setDateRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFrom={setCustomFrom}
              onCustomTo={setCustomTo}
              today={today}
              counts={rangeCounts}
            />
          </div>

          {/* What the table is currently showing */}
          <p className="text-xs text-gray-400">
            {stays.length} of {allStays.length} booking{allStays.length === 1 ? '' : 's'} match · newest first
            {dateRange === 'custom'
              ? (customFrom || customTo) && ` · booked ${customFrom || 'any'} → ${customTo || 'today'}`
              : dateRange !== 'all' && ` · ${DATE_RANGES.find(r => r.key === dateRange)?.label.toLowerCase()}`}
          </p>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Guest</th>
                  <th className="table-header">Room</th>
                  <th className="table-header">Stay</th>
                  <th className="table-header">Booked</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map(stay => {
                  const b        = stay.primary
                  const guest    = guestLabel(b)
                  const contact  = guestContact(b)
                  const n        = calcNights(b.check_in, b.check_out)
                  const srcObj   = SOURCES.find(s => s.value === b.source) ?? SOURCES[0]
                  const SrcIcon  = srcObj.icon
                  const multi    = stay.roomCount > 1
                  const roomName = b.room?.name ?? `Room ${b.room?.room_number}`
                  const typeName = (b.room?.room_type as { name?: string } | null)?.name
                  // Rows show their own room; rooms sharing a row aren't embedded.
                  const namedRooms  = stay.roomNames.join(', ')
                  const unnamedCount = stay.roomCount - stay.roomNames.length
                  const bookedToday = bookedOnOrAfter(b, startOfToday)

                  return (
                    <tr
                      key={stay.key}
                      onClick={() => router.push(`/hotel-admin/bookings/${b.id}`)}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >

                      {/* Guest */}
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <GuestAvatar guest={b} />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{guest}</p>
                            {contact && <p className="text-xs text-gray-400 mt-0.5">{contact}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Room(s) */}
                      <td className="table-cell max-w-[220px]">
                        <p className="text-sm font-medium text-gray-900">
                          {multi ? `${stay.roomCount} rooms` : roomName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {multi ? (
                            <span className="text-[11px] text-gray-500 truncate" title={namedRooms}>
                              {namedRooms}{unnamedCount > 0 ? ` +${unnamedCount}` : ''}
                            </span>
                          ) : typeName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                              {typeName}
                            </span>
                          ) : null}
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

                      {/* Booked on */}
                      <td className="table-cell">
                        {bookedToday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Today
                          </span>
                        ) : (
                          <p className="text-sm text-gray-600">{fmtDate(b.created_at)}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(b.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
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
                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(stay.total, currency)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <Users className="h-2.5 w-2.5 inline mr-0.5" />
                          {stay.adults + stay.children} guest{stay.adults + stay.children !== 1 ? 's' : ''}
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
                            onClick={() => setEditingKey(stay.key)}
                            title={multi ? `Edit all ${stay.roomCount} rooms` : 'Edit booking'}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingKey(stay.key)}
                            title={multi ? `Delete all ${stay.roomCount} rooms` : 'Delete booking'}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <BookingActions
                            bookingIds={stay.bookings.map(bk => bk.id)}
                            currentStatus={b.status}
                            onStatusChange={newStatus =>
                              setBookings(bs => {
                                const ids = new Set(stay.bookings.map(bk => bk.id))
                                return bs.map(bk => ids.has(bk.id) ? { ...bk, status: newStatus } : bk)
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!stays.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Calendar className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        {dateRange === 'today'
                          ? 'No bookings made today yet.'
                          : q || statusTab !== 'all' || dateRange !== 'all'
                            ? 'No bookings match your filters.'
                            : 'No bookings yet.'}
                      </p>
                      {(q || statusTab !== 'all' || dateRange !== 'all') && (
                        <button
                          onClick={() => { setQ(''); setStatusTab('all'); setDateRange('all'); setCustomFrom(''); setCustomTo('') }}
                          className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            onPage={setPage}
            perPage={perPage}
            onPerPage={setPerPage}
            total={stays.length}
            noun="booking"
          />
        </div>
      </div>

      {editingStay && (
        <EditBookingModal
          stay={editingStay}
          currency={currency}
          rooms={rooms}
          allBookings={bookings}
          onClose={() => setEditingKey(null)}
          onSaved={onSaved}
        />
      )}

      {deletingStay && (
        <DeleteConfirmModal
          stay={deletingStay}
          onClose={() => setDeletingKey(null)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}
