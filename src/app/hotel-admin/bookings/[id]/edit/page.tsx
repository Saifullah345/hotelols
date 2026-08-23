'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Moon, DoorOpen, Phone, MessageCircle, Globe, Check, CalendarDays, Users } from 'lucide-react'
import { createClient, getBrowserUser } from '@/lib/supabase/client'
import PhoneInput from '@/components/ui/PhoneInput'
import { formatCurrency } from '@/lib/currency'
import { nameSchema, phoneSchema } from '@/lib/validation'
import { distributeGuests, assignRoomsToRows, roomSetChanged } from '@/lib/booking'
import { guestLabel } from '@/lib/guest'
import RoomPicker, { type PickableRoom } from '@/components/admin/RoomPicker'

const SOURCES = [
  { value: 'walk_in',  label: 'Walk-in',  icon: DoorOpen,      color: 'text-orange-600', activeClass: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         color: 'text-blue-600',   activeClass: 'border-blue-400 bg-blue-50 text-blue-700'   },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600',  activeClass: 'border-green-400 bg-green-50 text-green-700'  },
  { value: 'online',   label: 'Online',   icon: Globe,         color: 'text-purple-600', activeClass: 'border-purple-400 bg-purple-50 text-purple-700' },
]

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

type Booking = {
  id: string
  check_in: string
  check_out: string
  adults: number
  children: number
  source: string
  special_requests: string | null
  guest_name: string | null
  guest_phone: string | null
  user_id: string | null
  room_ids: string[] | null
  total_amount: number
  user: { full_name?: string; email?: string } | null
  room: { id: string; room_number: string; name: string | null; price_per_night: number } | null
}

/** A sibling row of the same stay — enough of it to price and save alongside. */
type StayRow = {
  id: string
  room_ids: string[] | null
  adults: number
  children: number
  room: { price_per_night: number; capacity: number } | null
}

const calcNights = (ci: string, co: string) =>
  Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

export default function EditBookingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [booking,    setBooking]    = useState<Booking | null>(null)
  /** Other rows of the same stay — saved together with this one. */
  const [stayRows,   setStayRows]   = useState<StayRow[]>([])
  const [hotelRooms, setHotelRooms] = useState<PickableRoom[]>([])
  const [roomIds,    setRoomIds]    = useState<string[]>([])
  const [originalRoomIds, setOriginalRoomIds] = useState<string[]>([])
  const [takenIds,   setTakenIds]   = useState<Set<string>>(new Set())
  const [tenantId,   setTenantId]   = useState<string | null>(null)
  const [currency,   setCurrency]   = useState('USD')
  const [loading,    setLoading]    = useState(true)

  const [checkIn,    setCheckIn]    = useState('')
  const [checkOut,   setCheckOut]   = useState('')
  const [adults,     setAdults]     = useState(1)
  const [children,   setChildren]   = useState(0)
  const [source,     setSource]     = useState('walk_in')
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const user = await getBrowserUser(supabase)
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) { router.push('/login'); return }

      const [{ data: b }, { data: hotel }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, user:profiles(full_name, email), room:rooms(id, room_number, name, price_per_night)')
          .eq('id', id)
          .eq('hotel_id', profile.tenant_id)
          .single(),
        supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
      ])

      if (!b) { router.push('/hotel-admin/bookings'); return }

      // Rooms booked as one stay can sit on sibling rows. Editing only the row
      // that happens to be open would move its dates and split the stay in two,
      // so the siblings are loaded and saved alongside it.
      let siblings = supabase
        .from('bookings')
        .select('id, room_ids, adults, children, room:rooms(price_per_night, capacity)')
        .eq('hotel_id', profile.tenant_id)
        .eq('check_in', b.check_in)
        .eq('check_out', b.check_out)
        .eq('status', b.status)
        .neq('id', b.id)
      if (b.user_id) {
        siblings = siblings.eq('user_id', b.user_id)
      } else {
        siblings = siblings.is('user_id', null)
        siblings = b.guest_name  ? siblings.eq('guest_name', b.guest_name)   : siblings.is('guest_name', null)
        siblings = b.guest_phone ? siblings.eq('guest_phone', b.guest_phone) : siblings.is('guest_phone', null)
      }
      const { data: siblingRows } = await siblings
      const rows = (siblingRows ?? []) as unknown as StayRow[]
      setStayRows(rows)
      setTenantId(profile.tenant_id)

      // The hotel's rooms, so the desk can move the guest between them.
      const { data: roomList } = await supabase
        .from('rooms')
        .select('id, room_number, name, price_per_night, capacity, room_type:room_types(name)')
        .eq('hotel_id', profile.tenant_id)
        .order('sort_order', { ascending: true })
        .order('room_number')
      setHotelRooms((roomList ?? []) as unknown as PickableRoom[])

      const ownIds = [
        ...(b.room_ids?.length ? b.room_ids : b.room ? [b.room.id] : []),
        ...rows.flatMap(r => r.room_ids ?? []),
      ]
      setRoomIds(ownIds)
      setOriginalRoomIds(ownIds)

      setBooking(b as Booking)
      setCheckIn(b.check_in.slice(0, 10))
      setCheckOut(b.check_out.slice(0, 10))
      // Guest counts are shown for the whole stay, matching the list and the
      // detail page rather than the single row behind this URL.
      setAdults(b.adults + rows.reduce((s, r) => s + (r.adults ?? 0), 0))
      setChildren(b.children + rows.reduce((s, r) => s + (r.children ?? 0), 0))
      setSource(b.source ?? 'walk_in')
      setGuestName(b.guest_name ?? '')
      setGuestPhone(b.guest_phone ?? '')
      setNotes(b.special_requests ?? '')
      setCurrency((hotel as { currency?: string } | null)?.currency ?? 'USD')
      setLoading(false)
    }
    init()
  }, [id, router])

  const stayIds = useMemo(
    () => [booking?.id, ...stayRows.map(r => r.id)].filter(Boolean) as string[],
    [booking?.id, stayRows],
  )

  // Which rooms other bookings hold over the chosen nights. Re-read whenever the
  // dates move; the API re-checks on save, so this only has to be helpful.
  useEffect(() => {
    if (!tenantId || !checkIn || !checkOut || checkOut <= checkIn) return
    let cancelled = false
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('id, room_id, room_ids')
        .eq('hotel_id', tenantId)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)
      if (cancelled) return
      const taken = new Set<string>()
      for (const b of (data ?? []) as { id: string; room_id: string; room_ids: string[] | null }[]) {
        if (stayIds.includes(b.id)) continue
        for (const rid of (b.room_ids?.length ? b.room_ids : [b.room_id])) if (rid) taken.add(rid)
      }
      setTakenIds(taken)
    }
    load()
    return () => { cancelled = true }
  }, [tenantId, checkIn, checkOut, stayIds])

  const isOffline = !booking?.user

  // Rows of the whole stay, this one first.
  const allRows: StayRow[] = booking
    ? [
        {
          id: booking.id,
          // `room_ids` is kept in sync by the DB trigger, but fall back to the
          // primary room so this row is never seen as holding nothing.
          room_ids: booking.room_ids?.length ? booking.room_ids : booking.room ? [booking.room.id] : [],
          adults: booking.adults,
          children: booking.children,
          room: booking.room ? { price_per_night: booking.room.price_per_night, capacity: 0 } : null,
        },
        ...stayRows,
      ]
    : []
  const roomCount    = roomIds.length || allRows.reduce((s, r) => s + Math.max(1, r.room_ids?.length ?? 1), 0)
  const stayAdults   = allRows.reduce((s, r) => s + (r.adults ?? 0), 0)
  const stayChildren = allRows.reduce((s, r) => s + (r.children ?? 0), 0)
  const roomsChanged = roomSetChanged(roomIds, originalRoomIds)

  const roomById = useMemo(() => new Map(hotelRooms.map(r => [r.id, r])), [hotelRooms])

  const n = checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
    ? calcNights(checkIn, checkOut) : 0
  // Priced off the selected rooms, so a swap or removal shows straight away.
  const newTotal = n * roomIds.reduce((s, id) => s + Number(roomById.get(id)?.price_per_night ?? 0), 0)

  const save = async () => {
    if (!checkIn || !checkOut) { toast.error('Please set both check-in and check-out dates'); return }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return }

    if (isOffline) {
      const nameCheck = nameSchema.safeParse(guestName)
      if (!nameCheck.success) { toast.error(nameCheck.error.issues[0].message); return }
      if (guestPhone) {
        const phoneCheck = phoneSchema.safeParse(guestPhone)
        if (!phoneCheck.success) { toast.error(phoneCheck.error.issues[0].message); return }
      }
    }

    if (!roomIds.length) { toast.error('Keep at least one room, or delete the booking'); return }

    // Rooms are edited as one pool, then mapped back onto the rows they came from.
    const ownRoomsOf = (r: StayRow) => r.room_ids?.length ? r.room_ids : []
    const rowRooms   = assignRoomsToRows(allRows.map(ownRoomsOf), roomIds)

    // Guest counts belong to each row. Only redistribute them when the total
    // actually changed — otherwise every room keeps the party it was booked for.
    const adultsTouched   = adults   !== stayAdults
    const childrenTouched = children !== stayChildren
    const caps = allRows
      .map((_, i) => rowRooms[i])
      .filter(list => list.length)
      .map(list => {
        const cap = list.reduce((s, rid) => s + (roomById.get(rid)?.capacity ?? 0), 0)
        return cap > 0 ? cap : Number.MAX_SAFE_INTEGER
      })
    const adultSplit = adultsTouched   ? distributeGuests(adults, caps, 1)   : []
    const childSplit = childrenTouched ? distributeGuests(children, caps, 0) : []

    setSaving(true)
    let survivorIndex = 0
    for (const [i, row] of allRows.entries()) {
      // A row that lost every one of its rooms has nothing left to hold.
      if (!rowRooms[i].length) {
        const res = await fetch(`/api/bookings/${row.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setSaving(false)
          toast.error(json.error ?? 'Failed to remove the room')
          return
        }
        continue
      }

      const j = survivorIndex++
      const res = await fetch(`/api/bookings/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          ...(roomSetChanged(rowRooms[i], ownRoomsOf(row)) ? { room_ids: rowRooms[i] } : {}),
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
        return
      }
    }
    setSaving(false)
    toast.success(roomIds.length > 1 ? `Booking updated · ${roomIds.length} rooms` : 'Booking updated')
    router.push(`/hotel-admin/bookings/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const guest = booking ? guestLabel(booking) : 'Guest'
  const roomLabel = roomCount > 1
    ? `${roomCount} rooms`
    : (booking?.room?.name ?? `Room ${booking?.room?.room_number}`)

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/hotel-admin/bookings/${id}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Booking</h2>
          <p className="text-sm text-gray-500 mt-0.5">{guest} · {roomLabel}</p>
        </div>
      </div>

      {allRows.length > 1 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-800">
          These {roomCount} rooms were booked as one stay across {allRows.length} reservations —
          changes here are applied to all of them together.
        </div>
      )}

      {/* Step 1 — Guest Info (offline only) */}
      {isOffline && (
        <StepCard step={1} title="Guest Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                value={guestName}
                onChange={e => setGuestName(e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, ''))}
                className="input"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <PhoneInput value={guestPhone} onChange={setGuestPhone} className="w-full" />
            </div>
          </div>
        </StepCard>
      )}

      {/* Step 2 — Stay Dates */}
      <StepCard step={isOffline ? 2 : 1} title="Stay Dates">
        <div className="grid grid-cols-2 gap-4">
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
          <div className="mt-3 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-700 border border-gray-100">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary-500" />
              <strong>{n}</strong> night{n !== 1 ? 's' : ''}
            </span>
            {newTotal > 0 && <span className="font-bold text-primary-600">{formatCurrency(newTotal, currency)}</span>}
          </div>
        )}
      </StepCard>

      {/* Step 3 — Rooms */}
      <StepCard step={isOffline ? 3 : 2} title="Rooms">
        <RoomPicker
          rooms={hotelRooms}
          selected={roomIds}
          taken={takenIds}
          currency={currency}
          onChange={setRoomIds}
          changed={roomsChanged}
        />
      </StepCard>

      {/* Step 4 — Guests */}
      <StepCard step={isOffline ? 4 : 3} title="Guest Count">
        <div className="grid grid-cols-2 gap-4">
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
      </StepCard>

      {/* Step 5 — Booking Source */}
      <StepCard step={isOffline ? 5 : 4} title="Booking Source">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOURCES.map(s => {
            const Icon = s.icon
            const active = source === s.value
            return (
              <button key={s.value} type="button" onClick={() => setSource(s.value)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  active ? s.activeClass + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                <Icon className={`h-4 w-4 ${active ? '' : s.color}`} />
                {s.label}
              </button>
            )
          })}
        </div>
      </StepCard>

      {/* Step 6 — Special Requests */}
      <StepCard step={isOffline ? 6 : 5} title="Special Requests">
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} className="input resize-none" placeholder="Dietary needs, room preferences, early check-in…" />
      </StepCard>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Link href={`/hotel-admin/bookings/${id}`}
          className="btn-secondary">
          Cancel
        </Link>
        <button onClick={save} disabled={saving}
          className="btn-primary flex items-center gap-2 px-8">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

    </div>
  )
}
