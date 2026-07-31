'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar, Check, MapPin, Star, X, PhoneCall,
  BedDouble, Loader2, CheckCircle2, XCircle,
  MoonStar, Search, ChevronDown, SlidersHorizontal,
  AlertTriangle, Pencil, Clock, Plus, Minus, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { addDays, todayISO } from '@/lib/date'
import {
  canGuestEdit, guestEditHoursLeft, groupByStay, stayKey,
  distributeGuests, assignRoomsToRows, roomSetChanged,
} from '@/lib/booking'
import RoomPicker from '@/components/admin/RoomPicker'

/** The availability endpoint already filters; nothing extra is off-limits here. */
const EMPTY_SET: Set<string> = new Set()

// ─── Types ────────────────────────────────────────────────────────────
type Payment = { status?: string; amount?: number; payment_method?: string }
type Hotel   = { name?: string; city?: string; country?: string; currency?: string }
type Room    = { room_number?: string; room_type?: { name?: string } }
/** Every room on a booking, resolved from `room_ids`. */
type RoomInfo = {
  id: string
  room_number: string
  name: string | null
  price_per_night: number
  max_adults: number
  max_children: number
  room_type?: { name?: string } | null
}
type Review  = { id: string; rating: number; comment: string }
type Booking = {
  id: string
  hotel_id: string
  status: string
  check_in: string
  check_out: string
  adults: number
  children: number
  total_amount: number
  room_ids: string[] | null
  special_requests: string | null
  created_at: string
  hotel: Hotel
  room: Room
  payment: Payment | Payment[]
  review?: Review | Review[] | null
}

// ─── Constants ────────────────────────────────────────────────────────
const TABS = [
  { key: 'upcoming',  label: 'Upcoming',  statuses: ['pending', 'confirmed', 'checked_in'] },
  { key: 'completed', label: 'Completed', statuses: ['checked_out'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
] as const
type TabKey = (typeof TABS)[number]['key']

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  confirmed:   'Confirmed',
  checked_in:  'Checked In',
  checked_out: 'Completed',
  cancelled:   'Cancelled',
}
const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-amber-100  text-amber-700  border-amber-200',
  confirmed:   'bg-blue-100   text-blue-700   border-blue-200',
  checked_in:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  checked_out: 'bg-teal-100   text-teal-700   border-teal-200',
  cancelled:   'bg-red-100    text-red-500    border-red-200',
}
const PAYMENT_BADGE: Record<string, string> = {
  pending:   'bg-amber-50  text-amber-600',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-red-50    text-red-600',
  refunded:  'bg-gray-100  text-gray-500',
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Helpers ─────────────────────────────────────────────────────────
function nights(ci: string, co: string) {
  return Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))
}
function resolvePayment(raw: Payment | Payment[] | undefined) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.find(p => p.status === 'completed') ?? list[0]
}
function resolveReview(raw: Review | Review[] | undefined | null) {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

// ─── Stay grouping ───────────────────────────────────────────────────
/**
 * One card per stay, not per row.
 *
 * Rooms booked together now share a single booking row, but reservations made
 * before that — and any rooms added to the same stay in a later visit — are
 * separate rows describing one trip. Same hotel, same dates, same status means
 * the guest thinks of it as one booking, so it's presented as one.
 */
type Stay = {
  key: string
  bookings: Booking[]
  primary: Booking
  rooms: RoomInfo[]
  total: number
  adults: number
  children: number
  roomCount: number
}

function groupStays(list: Booking[], roomsById: Record<string, RoomInfo>): Stay[] {
  return groupByStay(list).map(bookings => {
    const roomIds = Array.from(new Set(bookings.flatMap(b => b.room_ids ?? []).filter(Boolean)))
    return {
      key: stayKey(bookings[0]),
      bookings,
      primary:  bookings[0],
      rooms:    roomIds.map(id => roomsById[id]).filter(Boolean) as RoomInfo[],
      total:    bookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0),
      adults:   bookings.reduce((s, b) => s + (b.adults ?? 0), 0),
      children: bookings.reduce((s, b) => s + (b.children ?? 0), 0),
      roomCount: roomIds.length || bookings.length,
    }
  })
}


// ─── Confirm Cancel Modal ─────────────────────────────────────────────
function ConfirmCancelModal({
  stay, cancelling, onConfirm, onDismiss,
}: {
  stay: Stay
  cancelling: boolean
  onConfirm: () => void
  onDismiss: () => void
}) {
  const booking = stay.primary
  const n = nights(booking.check_in, booking.check_out)
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-red-50 px-6 pt-6 pb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Cancel Booking?</h3>
          <p className="text-sm text-gray-500 mt-1">
            This will cancel {stay.roomCount > 1 ? `all ${stay.roomCount} rooms` : 'your booking'} at{' '}
            <span className="font-semibold text-gray-700">{booking.hotel?.name}</span>.
          </p>
        </div>

        {/* Booking summary */}
        <div className="px-6 py-4 space-y-2 border-b border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Check-in</span>
            <span className="font-medium text-gray-800">{fmt(booking.check_in)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Check-out</span>
            <span className="font-medium text-gray-800">{fmt(booking.check_out)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Duration</span>
            <span className="font-medium text-gray-800">{n} night{n !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rooms</span>
            <span className="font-medium text-gray-800">{stay.roomCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total</span>
            <span className="font-bold text-gray-900">{formatCurrency(stay.total, booking.hotel?.currency ?? 'PKR')}</span>
          </div>
        </div>

        <div className="px-6 py-3">
          <p className="text-xs text-gray-400 text-center">This action cannot be undone.</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={cancelling}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Guest counter ────────────────────────────────────────────────────
function Stepper({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-base font-bold text-gray-900 w-4 text-center">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">Max {max}</p>
    </div>
  )
}

// ─── Edit Booking Modal ───────────────────────────────────────────────
// Guests get one day to adjust their own reservation; after that the hotel has
// planned around it and changes go through them instead.
function EditBookingModal({
  stay, onSaved, onDismiss,
}: {
  stay: Stay
  onSaved: (patches: Record<string, Partial<Booking>>) => void
  onDismiss: () => void
}) {
  const { primary: booking, bookings, rooms } = stay

  const [checkIn,  setCheckIn]  = useState(booking.check_in.slice(0, 10))
  const [checkOut, setCheckOut] = useState(booking.check_out.slice(0, 10))
  const [adults,   setAdults]   = useState(Math.max(bookings.length, stay.adults))
  const [children, setChildren] = useState(Math.max(0, stay.children))
  const [notes,    setNotes]    = useState(booking.special_requests ?? '')
  const [saving,   setSaving]   = useState(false)
  const originalRoomIds = useMemo(() => bookings.flatMap(b => b.room_ids ?? []), [bookings])
  /** The rooms the guest wants to end up with — edited freely, applied on save. */
  const [roomIds, setRoomIds] = useState<string[]>(originalRoomIds)
  /** Other rooms the hotel can still let for these dates. */
  const [offered, setOffered] = useState<RoomInfo[]>([])

  const [today, setToday] = useState('')
  useEffect(() => { setToday(todayISO()) }, [])

  const currency  = booking.hotel?.currency ?? 'PKR'
  const n         = checkIn && checkOut && checkOut > checkIn ? nights(checkIn, checkOut) : 0
  const hoursLeft = guestEditHoursLeft(booking.created_at)

  // What else the hotel has free for these nights. A guest can't work this out
  // from the browser — their view of other people's bookings is empty by design.
  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) { setOffered([]); return }
    let cancelled = false
    const load = async () => {
      const params = new URLSearchParams({
        hotel_id: booking.hotel_id,
        check_in: checkIn,
        check_out: checkOut,
        exclude: bookings.map(b => b.id).join(','),
      })
      const res = await fetch(`/api/rooms/availability?${params}`)
      if (!res.ok || cancelled) return
      setOffered((await res.json()) as RoomInfo[])
    }
    load()
    return () => { cancelled = true }
  }, [booking.hotel_id, bookings, checkIn, checkOut])

  // Rooms already on the booking plus everything still on offer.
  const catalogue = useMemo(() => {
    const byId = new Map<string, RoomInfo>(rooms.map(r => [r.id, r]))
    for (const r of offered) if (!byId.has(r.id)) byId.set(r.id, r)
    return byId
  }, [rooms, offered])

  const chosen     = roomIds.map(id => catalogue.get(id)).filter(Boolean) as RoomInfo[]
  const adultLimit = Math.max(1, chosen.reduce((s, r) => s + (r.max_adults ?? 0), 0))
  const childLimit = chosen.reduce((s, r) => s + (r.max_children ?? 0), 0)
  const nightly    = chosen.reduce((s, r) => s + Number(r.price_per_night ?? 0), 0)
  const newTotal   = nightly > 0 ? n * nightly : stay.total
  const roomsChanged = roomSetChanged(roomIds, originalRoomIds)

  // Changing the rooms changes how many guests fit.
  useEffect(() => {
    setAdults(v => Math.min(Math.max(1, v), adultLimit))
    setChildren(v => Math.min(Math.max(0, v), childLimit))
  }, [adultLimit, childLimit])

  const onCheckInChange = (value: string) => {
    setCheckIn(value)
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDays(value, 1))
  }

  const save = async () => {
    if (!checkIn || !checkOut) { toast.error('Select check-in and check-out dates'); return }
    if (n <= 0) { toast.error('Check-out must be at least one night after check-in'); return }
    if (!roomIds.length) { toast.error('Keep at least one room, or cancel the booking'); return }

    // Rooms are edited as one pool, then mapped back onto the rows they came
    // from — a stay can still sit on several rows from before they were merged.
    const rowRooms = assignRoomsToRows(bookings.map(b => b.room_ids ?? []), roomIds)
    const caps = bookings
      .map((_, i) => rowRooms[i])
      .filter(list => list.length)
      .map(list => Math.max(1, list.reduce((s, id) => s + (catalogue.get(id)?.max_adults ?? 0), 0)))
    const childCaps = bookings
      .map((_, i) => rowRooms[i])
      .filter(list => list.length)
      .map(list => list.reduce((s, id) => s + (catalogue.get(id)?.max_children ?? 0), 0))

    const adultSplit = distributeGuests(adults, caps, 1)
    const childSplit = distributeGuests(children, childCaps, 0)

    setSaving(true)
    try {
      const patches: Record<string, Partial<Booking>> = {}

      // A row whose every room was dropped has nothing left to hold — cancel it.
      for (const [i, b] of bookings.entries()) {
        if (rowRooms[i].length) continue
        const res = await fetch('/api/bookings/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: b.id }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(json.error ?? 'Could not remove the room')
          if (Object.keys(patches).length) onSaved(patches)
          return
        }
        const pays = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : []
        patches[b.id] = {
          status: 'cancelled',
          payment: pays.map(p => p.status === 'pending' ? { ...p, status: 'failed' } : p),
        }
      }

      let j = 0
      for (const [i, b] of bookings.entries()) {
        if (!rowRooms[i].length) continue
        const changed = roomSetChanged(rowRooms[i], b.room_ids ?? [])
        const k = j++

        const res = await fetch(`/api/bookings/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            check_in: checkIn,
            check_out: checkOut,
            adults:   adultSplit[k],
            children: childSplit[k],
            special_requests: notes.trim() || null,
            ...(changed ? { room_ids: rowRooms[i] } : {}),
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(json.error ?? 'Could not update booking')
          // Whatever already saved is kept — the card must not show stale dates.
          if (Object.keys(patches).length) onSaved(patches)
          return
        }
        patches[b.id] = {
          check_in: checkIn,
          check_out: checkOut,
          adults:   adultSplit[k],
          children: childSplit[k],
          special_requests: notes.trim() || null,
          total_amount: json.total_amount ?? b.total_amount,
          ...(changed ? { room_ids: json.room_ids ?? rowRooms[i] } : {}),
        }
      }

      toast.success(roomsChanged
        ? `Booking updated · ${roomIds.length} room${roomIds.length > 1 ? 's' : ''}`
        : 'Booking updated')
      onSaved(patches)
    } catch {
      toast.error('Could not update booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 overflow-hidden">

        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Booking</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.hotel?.name} · {stay.roomCount} room{stay.roomCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button type="button" onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {hoursLeft > 0
              ? `You can change this booking for another ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`
              : 'Your window to change this booking has closed.'}
          </div>

          {/* Rooms — remove one, add another, or swap */}
          <RoomPicker
            rooms={Array.from(catalogue.values())}
            selected={roomIds}
            taken={EMPTY_SET}
            currency={currency}
            onChange={setRoomIds}
            changed={roomsChanged}
          />

          {/* Dates */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Check-in</label>
                <input type="date" value={checkIn} min={today || undefined}
                  onChange={e => onCheckInChange(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="label">Check-out</label>
                <input type="date" value={checkOut} min={checkIn ? addDays(checkIn, 1) : (today || undefined)}
                  onChange={e => setCheckOut(e.target.value)} className="input text-sm" />
              </div>
            </div>
            {n > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 text-sm">
                <span className="text-indigo-700 font-medium">{n} night{n !== 1 ? 's' : ''}</span>
                <span className="font-bold text-indigo-900">{formatCurrency(newTotal, currency)}</span>
              </div>
            )}
          </div>

          {/* Guests */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</p>
            <div className="flex items-center gap-8">
              <Stepper label="Adults" value={adults} min={1} max={adultLimit} onChange={setAdults} />
              {childLimit > 0 && (
                <Stepper label="Children" value={children} min={0} max={childLimit} onChange={setChildren} />
              )}
            </div>
          </div>

          {/* Special requests */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Special Requests <span className="normal-case text-gray-400 font-normal">(optional)</span>
            </p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="input resize-none text-sm" placeholder="Anything the hotel should know…" />
          </div>

          <p className="text-xs text-gray-400">
            Removing the last room isn&apos;t possible here — cancel the booking instead.
          </p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button type="button" onClick={onDismiss} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────
function BookingCard({
  stay, cancellingKey, reviewingId, reviewState,
  onCancel, onEdit, onRating, onComment, onSubmitReview,
}: {
  stay: Stay
  cancellingKey: string | null
  reviewingId: string | null
  reviewState: Record<string, { rating: number; comment: string }>
  onCancel: (key: string) => void
  onEdit: (key: string) => void
  onRating: (id: string, r: number) => void
  onComment: (id: string, c: string) => void
  onSubmitReview: (id: string) => void
}) {
  const { primary: booking, bookings, rooms, roomCount } = stay
  const { id, status, check_in, check_out, hotel, room } = booking
  const adults    = stay.adults
  const children  = stay.children
  const n         = nights(check_in, check_out)
  // A stay's payment is only settled once every row on it is.
  const payments  = bookings.map(b => resolvePayment(b.payment)?.status ?? 'pending')
  const payStatus = payments.every(p => p === 'completed') ? 'completed'
                  : payments.includes('pending') ? 'pending'
                  : payments[0]
  const payMethod = resolvePayment(booking.payment)?.payment_method
  const review     = resolveReview(booking.review)
  const rev        = reviewState[id] ?? { rating: 5, comment: '' }
  const isCancelled = status === 'cancelled'
  const isCompleted = status === 'checked_out'
  const badge       = STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'

  // Every row has to still be editable — a stay is changed as a whole.
  const editable  = bookings.every(b => canGuestEdit(b))
  const hoursLeft = Math.min(...bookings.map(b => guestEditHoursLeft(b.created_at)))
  const cancellable = bookings.every(b => b.status === 'pending')

  const label = (r: RoomInfo) =>
    `${r.name ?? r.room_number}${r.room_type?.name ? ` · ${r.room_type.name}` : ''}`

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${isCancelled ? 'border-red-100' : 'border-gray-200'}`}>

      {/* Top strip: hotel + status */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/hotels/${booking.hotel_id}`}
            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug">
            {hotel?.name ?? '—'}
          </Link>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {hotel?.city}, {hotel?.country}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => onEdit(stay.key)}
              title={`Editable for another ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => onCancel(stay.key)}
              disabled={cancellingKey === stay.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {cancellingKey === stay.key
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <X className="h-3 w-3" />}
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="mx-5 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-gray-50 px-4 py-3">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> {roomCount > 1 ? `Rooms (${roomCount})` : 'Room'}
          </p>
          <p className="text-sm font-medium text-gray-800 truncate">
            {roomCount > 1
              ? `${roomCount} rooms`
              : rooms[0]
                ? label(rooms[0])
                : `${room?.room_number ?? '—'}${room?.room_type?.name ? ` · ${room.room_type.name}` : ''}`}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Check-in
          </p>
          <p className="text-sm font-medium text-gray-800">
            {new Date(check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Check-out
          </p>
          <p className="text-sm font-medium text-gray-800">
            {new Date(check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <MoonStar className="h-3 w-3" /> Duration
          </p>
          <p className="text-sm font-medium text-gray-800">{n} night{n !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Every room on this one reservation */}
      {roomCount > 1 && rooms.length > 0 && (
        <div className="mx-5 mb-3">
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5">
            All {rooms.length} rooms on this booking
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rooms.map(r => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                <BedDouble className="h-3 w-3 text-indigo-400" />
                {label(r)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 pb-4 flex flex-wrap items-center gap-2.5 text-xs text-gray-500">
        <span className="font-bold text-gray-900 text-sm">{formatCurrency(stay.total, hotel?.currency ?? 'PKR')}</span>
        <span className="text-gray-200">|</span>
        <span>Payment</span>
        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${PAYMENT_BADGE[payStatus] ?? 'bg-gray-100 text-gray-500'}`}>
          {payStatus.replace('_', ' ')}
        </span>
        {payMethod && <span className="capitalize text-gray-400">· {payMethod}</span>}
        {adults > 0 && (
          <>
            <span className="text-gray-200">|</span>
            <span>{adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</span>
          </>
        )}
      </div>

      {/* Pending notice */}
      {status === 'pending' && (
        <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <PhoneCall className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting advance payment</p>
            <p className="text-xs text-amber-700 mt-0.5">Our team will contact you to collect a 50% advance. Booking confirms once received.</p>
            <p className="text-xs text-amber-700/80 mt-1">
              {editable
                ? `You can change the dates or guests yourself for another ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`
                : 'The 24-hour window to change this booking yourself has closed — please contact the hotel.'}
            </p>
          </div>
        </div>
      )}

      {/* Review form (completed, no review yet) */}
      {isCompleted && !review && (
        <div className="mx-5 mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> How was your stay?
          </p>
          <div className="flex items-center gap-0.5 mb-2.5">
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button" onClick={() => onRating(id, s)} className="p-0.5">
                <Star className={`h-5 w-5 transition-colors ${s <= rev.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="text" value={rev.comment} onChange={e => onComment(id, e.target.value)}
              placeholder="Tell us about your experience…" className="input text-sm flex-1" />
            <button onClick={() => onSubmitReview(id)}
              disabled={reviewingId === id || !rev.comment.trim()}
              className="btn-primary text-xs px-4 shrink-0 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              {reviewingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Review submitted */}
      {isCompleted && review && (
        <div className="mx-5 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">Your review</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
          {review.comment && <p className="text-xs text-gray-500 ml-1 truncate">{review.comment}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function CustomerBookingsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [bookings,     setBookings]     = useState<Booking[]>([])
  const [roomsById,    setRoomsById]    = useState<Record<string, RoomInfo>>({})
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<TabKey>('upcoming')
  const [cancellingKey,   setCancellingKey]   = useState<string | null>(null)
  const [confirmCancelKey, setConfirmCancelKey] = useState<string | null>(null)
  const [editingKey,      setEditingKey]      = useState<string | null>(null)
  const [reviewingId,  setReviewingId]  = useState<string | null>(null)
  const [reviewState,  setReviewState]  = useState<Record<string, { rating: number; comment: string }>>({})
  const [showFilters,  setShowFilters]  = useState(false)

  // Filters
  const [searchHotel,  setSearchHotel]  = useState('')
  const [filterMonth,  setFilterMonth]  = useState('')   // 'YYYY-MM'
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [sortOrder,    setSortOrder]    = useState<'asc'|'desc'>('desc')

  const getReview  = (id: string) => reviewState[id] ?? { rating: 5, comment: '' }
  const setRating  = (id: string, r: number) => setReviewState(p => ({ ...p, [id]: { ...getReview(id), rating: r } }))
  const setComment = (id: string, c: string) => setReviewState(p => ({ ...p, [id]: { ...getReview(id), comment: c } }))

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('bookings')
      .select('*, hotel:hotels(name, city, country, currency), room:rooms(room_number, room_type:room_types(name)), payment:payments(status, amount, payment_method), review:reviews(id, rating, comment)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const list = (data ?? []) as Booking[]
    setBookings(list)

    // A booking can cover several rooms; the embedded `room` is only the
    // primary one, so resolve every id on every booking in one round trip.
    const ids = Array.from(new Set(list.flatMap(b => b.room_ids ?? []).filter(Boolean)))
    if (ids.length) {
      const { data: roomRows } = await supabase
        .from('rooms')
        .select('id, room_number, name, price_per_night, max_adults, max_children, room_type:room_types(name)')
        .in('id', ids)
      setRoomsById(
        Object.fromEntries(((roomRows ?? []) as unknown as RoomInfo[]).map(r => [r.id, r])),
      )
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    const p = searchParams.get('payment')
    if (p === 'success')   { toast.success('Payment completed'); fetchBookings() }
    if (p === 'cancelled') { toast.error('Payment was cancelled') }
  }, [fetchBookings, searchParams])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Step 1 — show the confirm modal
  const requestCancel = (key: string) => setConfirmCancelKey(key)

  // Step 2 — user confirmed: cancel every row the stay is made of
  const handleCancel = async (stay: Stay) => {
    setCancellingKey(stay.key)
    const cancelled: string[] = []
    try {
      for (const b of stay.bookings) {
        const res  = await fetch('/api/bookings/cancel', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: b.id }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { toast.error(json.error ?? 'Could not cancel booking'); break }
        cancelled.push(b.id)
      }

      if (cancelled.length) {
        toast.success(
          cancelled.length === stay.bookings.length
            ? 'Booking cancelled'
            : `Cancelled ${cancelled.length} of ${stay.bookings.length} rooms`,
        )
        setBookings(prev => prev.map(b => {
          if (!cancelled.includes(b.id)) return b
          const list = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : []
          return { ...b, status: 'cancelled', payment: list.map((p: Payment) => p.status === 'pending' ? { ...p, status: 'failed' } : p) }
        }))
      }
      setConfirmCancelKey(null)
    } catch { toast.error('Could not cancel booking') }
    finally  { setCancellingKey(null) }
  }

  const handleSubmitReview = async (bookingId: string) => {
    const { rating, comment } = getReview(bookingId)
    if (!comment.trim()) return
    setReviewingId(bookingId)
    const booking = bookings.find(b => b.id === bookingId)
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, hotel_id: booking?.hotel_id ?? '', rating, comment }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Could not submit review') }
    else {
      toast.success('Review submitted!')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, review: json } : b))
      setReviewState(prev => { const n = { ...prev }; delete n[bookingId]; return n })
    }
    setReviewingId(null)
  }

  // Available months from all bookings (for the month filter chips)
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach(b => set.add(b.check_in.slice(0, 7)))
    return Array.from(set).sort()
  }, [bookings])

  // One card per stay: rooms booked for the same hotel and dates belong together
  // even when they landed on separate rows.
  const stays = useMemo(() => groupStays(bookings, roomsById), [bookings, roomsById])

  // Tab counts — stays, not rows, so a 3-room trip counts once
  const countByTab = useMemo(() => {
    const map: Record<string, number> = { upcoming: 0, completed: 0, cancelled: 0 }
    stays.forEach(s => {
      const status = s.primary.status
      if (['pending','confirmed','checked_in'].includes(status)) map.upcoming++
      else if (status === 'checked_out') map.completed++
      else if (status === 'cancelled')   map.cancelled++
    })
    return map
  }, [stays])

  // Tab + filter pipeline
  const visibleStays = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab)!
    let list = stays.filter(s => (tab.statuses as readonly string[]).includes(s.primary.status))

    if (searchHotel.trim()) {
      const q = searchHotel.toLowerCase()
      list = list.filter(s => s.primary.hotel?.name?.toLowerCase().includes(q) || s.primary.hotel?.city?.toLowerCase().includes(q))
    }
    if (filterMonth) {
      list = list.filter(s => s.primary.check_in.startsWith(filterMonth))
    }
    if (filterFrom) {
      list = list.filter(s => s.primary.check_in >= filterFrom)
    }
    if (filterTo) {
      list = list.filter(s => s.primary.check_in <= filterTo)
    }

    // Sorted by when the booking was made, not when the stay starts — a
    // booking made just now belongs at the top even if the trip is months out.
    return [...list].sort((a, b) => {
      const at = new Date(a.primary.created_at).getTime()
      const bt = new Date(b.primary.created_at).getTime()
      return sortOrder === 'desc' ? bt - at : at - bt
    })
  }, [stays, activeTab, searchHotel, filterMonth, filterFrom, filterTo, sortOrder])

  const hasFilters = searchHotel || filterMonth || filterFrom || filterTo
  const clearFilters = () => { setSearchHotel(''); setFilterMonth(''); setFilterFrom(''); setFilterTo('') }

  const editingStay = stays.find(s => s.key === editingKey) ?? null
  const cancelStay  = stays.find(s => s.key === confirmCancelKey) ?? null

  const cardProps = {
    cancellingKey, reviewingId, reviewState,
    onCancel: requestCancel,
    onEdit: setEditingKey,
    onRating: setRating, onComment: setComment, onSubmitReview: handleSubmitReview,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">My Bookings</h2>
            <p className="text-indigo-300 text-sm mt-0.5">{stays.length} total booking{stays.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {countByTab.upcoming > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <Calendar className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-white font-bold leading-none">{countByTab.upcoming}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Upcoming</p>
                </div>
              </div>
            )}
            {countByTab.completed > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-white font-bold leading-none">{countByTab.completed}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Completed</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); clearFilters() }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {countByTab[tab.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {countByTab[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {/* Search + toggle */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchHotel}
              onChange={e => setSearchHotel(e.target.value)}
              placeholder="Search by hotel or city…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || filterMonth || filterFrom || filterTo
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasFilters && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Sort</span>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'asc'|'desc')}
              className="text-sm border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
            >
              <option value="desc">Newest booking first</option>
              <option value="asc">Oldest booking first</option>
            </select>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-4">

            {/* Month chips */}
            {availableMonths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Month</p>
                <div className="flex flex-wrap gap-2">
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    const label = `${MONTHS[parseInt(mo) - 1]} ${y}`
                    const active = filterMonth === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFilterMonth(active ? '' : m)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date range */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Check-in Date Range</p>
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">To</label>
                  <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    min={filterFrom}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="self-end text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-2">
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Booking list ── */}
      <div className="space-y-3">
        {visibleStays.map(s => (
          <BookingCard key={s.key} stay={s} {...cardProps} />
        ))}

        {/* Empty states */}
        {visibleStays.length === 0 && bookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-800 mb-1">No bookings yet</p>
            <p className="text-sm text-gray-400 mb-5">Find a hotel and make your first booking</p>
            <Link href="/" className="btn-primary text-sm px-5">Browse Hotels</Link>
          </div>
        )}

        {visibleStays.length === 0 && bookings.length > 0 && !hasFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 py-14 text-center">
            {activeTab === 'upcoming' && (
              <>
                <CheckCircle2 className="h-10 w-10 text-teal-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">No upcoming bookings</p>
                <p className="text-sm text-gray-400 mb-5">Ready for your next trip?</p>
                <Link href="/" className="btn-primary text-sm px-5">Find a Hotel</Link>
              </>
            )}
            {activeTab === 'completed' && (
              <>
                <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No completed stays yet</p>
                <p className="text-sm text-gray-400 mt-1">Completed stays will appear here after checkout</p>
              </>
            )}
            {activeTab === 'cancelled' && (
              <>
                <XCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No cancelled bookings</p>
                <p className="text-sm text-gray-400 mt-1">Great news — nothing cancelled!</p>
              </>
            )}
          </div>
        )}

        {visibleStays.length === 0 && hasFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
            <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No bookings match your filters</p>
            <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Booking Modal ── */}
      {editingStay && (
        <EditBookingModal
          stay={editingStay}
          onSaved={patches => {
            setBookings(prev => prev.map(b => patches[b.id] ? { ...b, ...patches[b.id] } : b))
            setEditingKey(null)
          }}
          onDismiss={() => setEditingKey(null)}
        />
      )}

      {/* ── Confirm Cancel Modal ── */}
      {cancelStay && (
        <ConfirmCancelModal
          stay={cancelStay}
          cancelling={cancellingKey === cancelStay.key}
          onConfirm={() => handleCancel(cancelStay)}
          onDismiss={() => setConfirmCancelKey(null)}
        />
      )}
    </div>
  )
}
