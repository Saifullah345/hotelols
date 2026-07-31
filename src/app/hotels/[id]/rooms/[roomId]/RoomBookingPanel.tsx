'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, LogIn, Plus, Minus, ShoppingBag,
  Calendar, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { addDays, todayISO } from '@/lib/date'
import { createClient } from '@/lib/supabase/client'
import { isProfileComplete, missingProfileFields } from '@/lib/profile'

export type ExtraService = {
  id: string
  name: string
  description?: string
  price: number
  per: 'flat' | 'per_night' | 'per_person'
}

interface Props {
  roomId: string
  hotelId: string
  pricePerNight: number
  maxAdults: number
  maxChildren: number
  extraServices: ExtraService[]
  isLoggedIn: boolean
  currency?: string
  /** Carried over from the search so the guest doesn't re-enter their stay. */
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: number
  defaultChildren?: number
}

export default function RoomBookingPanel({
  roomId, hotelId, pricePerNight, maxAdults, maxChildren, extraServices, isLoggedIn,
  currency = 'PKR',
  defaultCheckIn = '',
  defaultCheckOut = '',
  defaultAdults,
  defaultChildren,
}: Props) {
  const fmt = (n: number) => formatCurrency(n, currency)
  const router  = useRouter()

  // Occupancy is whatever the hotel set for this room — never a generic default.
  const adultLimit = Math.max(1, maxAdults || 1)
  const childLimit = Math.max(0, maxChildren || 0)

  const [checkIn,  setCheckIn]  = useState(defaultCheckIn)
  // A same-day (or reversed) range carried over from the search is zero nights
  // and can't be booked — round it up to one night instead.
  const [checkOut, setCheckOut] = useState(
    defaultCheckIn && (!defaultCheckOut || defaultCheckOut <= defaultCheckIn)
      ? addDays(defaultCheckIn, 1)
      : defaultCheckOut,
  )
  const [adults,   setAdults]   = useState(Math.min(Math.max(1, defaultAdults ?? 1), adultLimit))
  const [children, setChildren] = useState(Math.min(Math.max(0, defaultChildren ?? 0), childLimit))
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading,  setLoading]  = useState(false)

  // Resolved after mount — "today" depends on the viewer's timezone, and
  // rendering it during SSR would make the markup disagree on hydration.
  const [today, setToday] = useState('')
  useEffect(() => { setToday(todayISO()) }, [])

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
    : 0

  const roomTotal = nights * pricePerNight

  const selectedList = extraServices.filter(s => selected[s.id])

  const extraAmount = (s: ExtraService) => {
    if (s.per === 'flat')       return s.price
    if (s.per === 'per_night')  return s.price * Math.max(nights, 1)
    return s.price * adults   // per_person
  }

  const extrasTotal = selectedList.reduce((sum, s) => sum + extraAmount(s), 0)
  const grandTotal  = roomTotal + extrasTotal

  const toggle = (id: string) => setSelected(p => ({ ...p, [id]: !p[id] }))

  // Picking a check-in fills in a check-out rather than leaving an unusable
  // same-day range behind.
  const onCheckInChange = (value: string) => {
    setCheckIn(value)
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDays(value, 1))
  }

  const handleBook = async () => {
    if (!checkIn || !checkOut)  { toast.error('Select check-in and check-out dates'); return }
    if (nights <= 0)            { toast.error('Check-out must be at least one night after check-in'); return }
    if (adults > adultLimit)    { toast.error(`This room takes up to ${adultLimit} adult${adultLimit === 1 ? '' : 's'}`); return }
    if (children > childLimit)  { toast.error(`This room takes up to ${childLimit} child${childLimit === 1 ? '' : 'ren'}`); return }

    // The hotel needs a name and phone to confirm the stay. Send the guest to
    // fill those in, then straight back here with the dates still filled in.
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      if (!isProfileComplete(profile)) {
        const back = new URLSearchParams({
          check_in: checkIn, check_out: checkOut,
          adults: String(adults), children: String(children),
        })
        toast.info(`Add your ${missingProfileFields(profile).join(' and ')} to finish this booking`)
        router.push(
          `/customer/profile?next=${encodeURIComponent(`/hotels/${hotelId}/rooms/${roomId}?${back}`)}`,
        )
        return
      }
    }

    let specialRequests: string | null = null
    if (selectedList.length) {
      specialRequests = 'Extra services requested:\n' + selectedList.map(s => {
        const total = extraAmount(s)
        const note  = s.per === 'flat'
          ? fmt(total)
          : s.per === 'per_night'
            ? `${fmt(s.price)}/night × ${nights} = ${fmt(total)}`
            : `${fmt(s.price)}/person × ${adults} = ${fmt(total)}`
        return `• ${s.name}: ${note}`
      }).join('\n')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: hotelId,
          room_id:  roomId,
          check_in:  checkIn,
          check_out: checkOut,
          adults,
          children,
          special_requests: specialRequests,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not create booking'); return }
      toast.success('Booking submitted! The hotel will contact you to confirm your stay.')
      router.push('/customer/bookings')
    } catch {
      toast.error('Could not create booking')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <p className="text-3xl font-bold text-gray-900">{fmt(pricePerNight)}</p>
          <p className="text-sm text-gray-500">per night</p>
        </div>
        <a
          href={`/login?next=/hotels/${hotelId}/rooms/${roomId}`}
          className="w-full flex items-center justify-center gap-2 btn-primary py-3"
        >
          <LogIn className="h-4 w-4" /> Sign in to book
        </a>
        <p className="text-xs text-center text-gray-400">Free to register · Pay at property</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">

      {/* Price header */}
      <div className="p-5">
        <p className="text-3xl font-bold text-gray-900">{fmt(pricePerNight)}</p>
        <p className="text-sm text-gray-500">per night</p>
      </div>

      {/* Dates */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> Select Dates
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Check-in</label>
            <input
              type="date"
              min={today || undefined}
              value={checkIn}
              onChange={e => onCheckInChange(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input
              type="date"
              min={checkIn ? addDays(checkIn, 1) : (today || undefined)}
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>
        {checkIn && checkOut && nights <= 0 && (
          <p className="text-xs text-amber-600">Check-out must be at least one night after check-in.</p>
        )}
        {nights > 0 && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-indigo-700 font-medium">{nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-bold text-indigo-900">{fmt(roomTotal)}</span>
          </div>
        )}
      </div>

      {/* Guests */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</p>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-2">Adults</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAdults(v => Math.max(1, v - 1))}
                disabled={adults <= 1}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-base font-bold text-gray-900 w-4 text-center">{adults}</span>
              <button type="button" onClick={() => setAdults(v => Math.min(adultLimit, v + 1))}
                disabled={adults >= adultLimit}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">Max {adultLimit}</p>
          </div>
          {childLimit > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Children</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setChildren(v => Math.max(0, v - 1))}
                  disabled={children <= 0}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-base font-bold text-gray-900 w-4 text-center">{children}</span>
                <button type="button" onClick={() => setChildren(v => Math.min(childLimit, v + 1))}
                  disabled={children >= childLimit}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">Max {childLimit}</p>
            </div>
          )}
        </div>
      </div>

      {/* Extra Services */}
      {extraServices.length > 0 && (
        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Add-On Services
            <span className="font-normal text-gray-400 normal-case">(optional)</span>
          </p>
          <div className="space-y-2">
            {extraServices.map(service => {
              const checked    = !!selected[service.id]
              const perLabel   = service.per === 'flat' ? 'per stay' : service.per === 'per_night' ? 'per night' : 'per person'
              return (
                <label
                  key={service.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(service.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-4">{service.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(service.price)}</p>
                    <p className="text-xs text-gray-400">{perLabel}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Price breakdown */}
      {nights > 0 && (
        <div className="p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Breakdown</p>
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{fmt(pricePerNight)} × {nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="font-medium text-gray-900">{fmt(roomTotal)}</span>
            </div>
            {selectedList.map(s => (
              <div key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="font-medium text-gray-900">{fmt(extraAmount(s))}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2.5 border-t border-gray-100 text-base font-bold text-gray-900">
              <span>Total</span>
              <span className="text-indigo-700">{fmt(grandTotal)}</span>
            </div>
          </div>
          {selectedList.length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
              ⚠ Extra services are billed by the hotel at check-in/check-out.
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="p-5 space-y-3">
        {/* Stays clickable with an incomplete stay — the click explains what's
            missing instead of the button going dead silently. */}
        <button
          onClick={handleBook}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</>
            : <><CheckCircle2 className="h-4 w-4" /> Book Now</>}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          No payment now · Pay at the property
        </div>
      </div>
    </div>
  )
}
