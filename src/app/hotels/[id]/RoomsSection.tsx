'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BedDouble, Users, Plus, Minus, Check, Calendar,
  Loader2, X, ArrowRight, LogIn, ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { addDays, todayISO } from '@/lib/date'
import { createClient } from '@/lib/supabase/client'
import { isProfileComplete, missingProfileFields } from '@/lib/profile'

/** Where a selection is parked while the guest completes their profile. */
const PENDING_KEY = (hotelId: string) => `bookqayam:pending-booking:${hotelId}`

type Room = {
  id: string
  room_number: string
  name: string | null
  floor: number
  price_per_night: number
  max_adults: number
  max_children: number
  images: string[] | null
  amenities: string[] | null
  room_type: { name?: string } | null
}

interface Props {
  rooms: Room[]
  hotelId: string
  isLoggedIn: boolean
  currency?: string
  /** Carried over from the search so the guest doesn't re-enter their stay. */
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: number
  /** Shown instead of the generic copy when a date filter emptied the list. */
  emptyMessage?: string
}

export default function RoomsSection({
  rooms, hotelId, isLoggedIn,
  currency = 'PKR',
  defaultCheckIn = '',
  defaultCheckOut = '',
  defaultAdults,
  emptyMessage,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checkIn,  setCheckIn]  = useState(defaultCheckIn)
  const [checkOut, setCheckOut] = useState(defaultCheckOut)
  const [adults,   setAdults]   = useState(Math.max(1, defaultAdults ?? 1))
  const [children, setChildren] = useState(0)
  const [loading,  setLoading]  = useState(false)

  // Resolved after mount — "today" depends on the viewer's timezone, and
  // rendering it during SSR would make the markup disagree on hydration.
  const [today, setToday] = useState('')
  useEffect(() => { setToday(todayISO()) }, [])

  // Coming back from the profile detour: put the selection back where it was.
  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_KEY(hotelId))
    if (!stored) return
    sessionStorage.removeItem(PENDING_KEY(hotelId))
    try {
      const saved = JSON.parse(stored) as { roomIds?: string[]; checkIn?: string; checkOut?: string; adults?: number; children?: number }
      const stillListed = (saved.roomIds ?? []).filter(id => rooms.some(r => r.id === id))
      if (!stillListed.length) return
      setSelected(new Set(stillListed))
      if (saved.checkIn)         setCheckIn(saved.checkIn)
      if (saved.checkOut)        setCheckOut(saved.checkOut)
      if (saved.adults)          setAdults(saved.adults)
      if (saved.children != null) setChildren(saved.children)
      toast.info('Your rooms are still selected — finish your booking below')
    } catch {
      // A malformed entry just means starting fresh.
    }
  }, [hotelId, rooms])

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
      ))
    : 0

  const selectedRooms  = rooms.filter(r => selected.has(r.id))
  const totalPerNight  = selectedRooms.reduce((s, r) => s + r.price_per_night, 0)
  const grandTotal     = totalPerNight * nights

  // The whole party shares one reservation across the selected rooms, so the
  // ceiling is their combined adult capacity — whatever the hotel set per room.
  // Uncapped while nothing is selected, so the party size carried over from the
  // search survives until there's a real room limit to measure it against.
  const maxAdults = selectedRooms.length
    ? Math.max(1, selectedRooms.reduce((sum, r) => sum + (r.max_adults || 0), 0))
    : Infinity

  const maxChildren = selectedRooms.length
    ? selectedRooms.reduce((sum, r) => sum + (r.max_children || 0), 0)
    : 0

  // Selecting a smaller room pulls an over-sized party back down to what fits.
  useEffect(() => {
    setAdults(v => Math.min(Math.max(1, v), maxAdults))
  }, [maxAdults])

  useEffect(() => {
    setChildren(v => Math.min(v, maxChildren))
  }, [maxChildren])

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Picking a check-in fills in a check-out rather than leaving an unusable
  // same-day range behind.
  const onCheckInChange = (value: string) => {
    setCheckIn(value)
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDays(value, 1))
  }

  const handleBookAll = async () => {
    if (!checkIn || !checkOut)  { toast.error('Select check-in and check-out dates'); return }
    if (nights <= 0)            { toast.error('Check-out must be at least one night after check-in'); return }
    if (!selected.size)         { toast.error('Select at least one room');             return }
    if (adults > maxAdults)     { toast.error(`These rooms take up to ${maxAdults} adult${maxAdults === 1 ? '' : 's'}`); return }

    // The hotel needs a name and phone to confirm the stay. Send the guest to
    // fill those in; the selection is put back when they come back.
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      if (!isProfileComplete(profile)) {
        sessionStorage.setItem(PENDING_KEY(hotelId), JSON.stringify({
          roomIds: selectedRooms.map(r => r.id), checkIn, checkOut, adults, children,
        }))
        toast.info(`Add your ${missingProfileFields(profile).join(' and ')} to finish this booking`)
        router.push(`/customer/profile?next=${encodeURIComponent(`/hotels/${hotelId}#rooms`)}`)
        return
      }
    }

    setLoading(true)
    try {
      // One reservation covering every selected room, not one per room.
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id:  hotelId,
          room_ids:  selectedRooms.map(r => r.id),
          check_in:  checkIn,
          check_out: checkOut,
          adults,
          children,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not create booking'); return }

      toast.success(
        `Booking submitted for ${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''}! The hotel will contact you to confirm.`
      )
      router.push('/customer/bookings')
    } catch {
      toast.error('Could not create booking')
    } finally {
      setLoading(false)
    }
  }

  if (!rooms.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
        {emptyMessage ?? 'No rooms available at this time — check back soon.'}
      </div>
    )
  }

  return (
    <>
      <div className={`space-y-4 ${selected.size > 0 ? 'pb-52 sm:pb-44' : ''}`}>
        {rooms.map(room => {
          const images     = (room.images as string[] | null) ?? []
          const amenities  = (room.amenities as string[] | null) ?? []
          const type       = room.room_type as { name?: string } | null
          const thumb      = images[0]
          const href       = `/hotels/${hotelId}/rooms/${room.id}`
          const isSelected = selected.has(room.id)

          return (
            <div
              key={room.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                isSelected
                  ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200'
                  : 'border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <Link href={href} className="sm:w-44 shrink-0 group">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={type?.name ?? 'Room'}
                      className="h-44 sm:h-full w-full object-cover group-hover:brightness-95 transition"
                    />
                  ) : (
                    <div className="flex h-44 sm:h-full w-full items-center justify-center bg-indigo-50">
                      <BedDouble className="h-10 w-10 text-indigo-300" />
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <Link href={href} className="hover:text-indigo-700 transition-colors">
                      <h3 className="font-semibold text-gray-900">
                        {room.name ?? `Room ${room.room_number}`}
                        {type?.name && (
                          <span className="ml-1.5 text-sm text-gray-400 font-normal">({type.name})</span>
                        )}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                      <span>Floor {room.floor}</span>
                      {room.max_adults > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {room.max_adults} adult{room.max_adults !== 1 ? 's' : ''}
                          {room.max_children > 0 ? `, ${room.max_children} children` : ''}
                        </span>
                      )}
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {amenities.slice(0, 4).map(a => (
                          <span key={a} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {a}
                          </span>
                        ))}
                        {amenities.length > 4 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            +{amenities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                    >
                      View details & extras <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Price + action */}
                  <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:text-right shrink-0">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(room.price_per_night, currency)}
                      </p>
                      <p className="text-sm text-gray-500">per night</p>
                    </div>

                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => toggle(room.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {isSelected ? (
                          <><Check className="h-4 w-4" /> Selected</>
                        ) : (
                          <><Plus className="h-4 w-4" /> Select</>
                        )}
                      </button>
                    ) : (
                      <a
                        href={`/login?next=/hotels/${hotelId}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                      >
                        <LogIn className="h-3.5 w-3.5" /> Sign in to book
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Floating booking panel ─────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden">

            {/* Panel header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {selected.size}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">
                    {selected.size} room{selected.size > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-indigo-200 text-xs truncate">
                    {selectedRooms.map(r => r.name ?? `Room ${r.room_number}`).join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-white/70 hover:text-white p-1 transition-colors shrink-0"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">

                {/* Date pickers */}
                <div className="grid grid-cols-2 gap-3 flex-1 w-full sm:w-auto">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Calendar className="h-3 w-3" /> Check-in
                    </label>
                    <input
                      type="date"
                      min={today || undefined}
                      value={checkIn}
                      onChange={e => onCheckInChange(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Calendar className="h-3 w-3" /> Check-out
                    </label>
                    <input
                      type="date"
                      min={checkIn ? addDays(checkIn, 1) : (today || undefined)}
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                {/* Adults counter */}
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Adults</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(v => Math.max(1, v - 1))}
                      disabled={adults <= 1}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(v => Math.min(maxAdults, v + 1))}
                      disabled={adults >= maxAdults}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">Max {maxAdults} in total</p>
                </div>

                {/* Children counter — only when selected rooms allow children */}
                {maxChildren > 0 && (
                  <div className="shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Children</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren(v => Math.max(0, v - 1))}
                        disabled={children <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-5 text-center">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(v => Math.min(maxChildren, v + 1))}
                        disabled={children >= maxChildren}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Max {maxChildren} in total</p>
                  </div>
                )}

                {/* Total + book button */}
                <div className="w-full sm:w-auto sm:text-right shrink-0">
                  {nights > 0 && (
                    <>
                      <p className="text-xs text-gray-500 mb-0.5">
                        {nights} night{nights !== 1 ? 's' : ''} · {formatCurrency(totalPerNight, currency)}/night
                      </p>
                      <p className="text-lg font-bold text-indigo-700 mb-2">
                        Total: {formatCurrency(grandTotal, currency)}
                      </p>
                    </>
                  )}
                  {/* Stays clickable with an incomplete stay — the click explains
                      what's missing instead of the button going dead silently. */}
                  <button
                    type="button"
                    onClick={handleBookAll}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</>
                    ) : (
                      <>Book {selected.size} Room{selected.size > 1 ? 's' : ''}</>
                    )}
                  </button>
                  <div className="flex items-center justify-center sm:justify-end gap-1 mt-1.5 text-xs text-gray-400">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    No payment now · Pay at the property
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
