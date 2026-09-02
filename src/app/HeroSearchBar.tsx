'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, Search, Plus, Minus } from 'lucide-react'
import { addDays, todayISO } from '@/lib/date'

export default function HeroSearchBar({
  defaultCity = '',
  defaultCheckIn = '',
  defaultCheckOut = '',
  // 0 = nothing chosen yet. Guests stay unselected until the user picks a count.
  defaultAdults = 0,
  defaultChildren = 0,
}: {
  defaultCity?: string
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: number
  defaultChildren?: number
}) {
  const router = useRouter()
  const [city,      setCity]      = useState(defaultCity)
  const [checkIn,   setCheckIn]   = useState(defaultCheckIn)
  const [checkOut,  setCheckOut]  = useState(defaultCheckOut)
  const [adults,    setAdults]    = useState(defaultAdults)
  const [children,  setChildren]  = useState(defaultChildren)
  const [guestOpen, setGuestOpen] = useState(false)
  // Drives the date placeholders: an empty, unfocused field shows its word.
  const [checkInFocus,  setCheckInFocus]  = useState(false)
  const [checkOutFocus, setCheckOutFocus] = useState(false)

  // Resolved after mount: "today" depends on the viewer's timezoneand
  // rendering it during SSR would make the server markup disagree on hydration.
  const [today, setToday] = useState('')
  useEffect(() => { setToday(todayISO()) }, [])

  const guestSum    = adults + children
  const hasGuests   = guestSum > 0

  const nextDay = (date: string) => addDays(date, 1)

  // A stay needs both ends of the range to be searchable, so picking one date
  // fills in the other rather than silently dropping the filter.
  const onCheckInChange = (value: string) => {
    setCheckIn(value)
    if (value && (!checkOut || checkOut <= value)) setCheckOut(nextDay(value))
  }

  const onCheckOutChange = (value: string) => {
    setCheckOut(value)
    if (value && checkIn && value <= checkIn) setCheckIn('')
  }

  const handleSearch = () => {
    const p = new URLSearchParams()
    if (city.trim()) p.set('city', city.trim())
    // Only send a range the results page can actually use.
    if (checkIn && checkOut && checkOut > checkIn) {
      p.set('check_in', checkIn)
      p.set('check_out', checkOut)
    }
    // Only carried in the URL once the user actually picks a party size.
    if (hasGuests) {
      p.set('adults',   String(adults))
      p.set('children', String(children))
    }
    const qs = p.toString()
    // #results jumps past the hero so the guest lands on what they searched for.
    router.push(qs ? `/?${qs}#results` : '/')
  }

  const clearGuests = () => {
    setAdults(0)
    setChildren(0)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-1.5 flex flex-col lg:flex-row gap-1.5">

      {/* One line per field — the stacked caption above each value is what made
          the bar twice an input's height. Captions that are still needed now sit
          inline; the rest is carried by the placeholder. */}

      {/* Destination */}
      <label className="flex items-center gap-2 flex-1 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 cursor-text transition-colors min-w-0">
        <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="City or hotel name"
          aria-label="Destination"
          className="w-full min-w-0 text-[13px] font-semibold text-gray-900 placeholder-gray-400 bg-transparent outline-none"
        />
      </label>

      {/* Check-in */}
      {/* A date input has no placeholder of its own — it always paints dd/mm/yyyy.
          So the native text is made transparent while the field is empty and
          untouchedand the word sits on top of it instead. Focus hands the real
          editor back so you can see what you are typing. */}
      <label className="relative flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 cursor-pointer transition-colors flex-shrink-0">
        <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        {!checkIn && !checkInFocus && (
          <span className="pointer-events-none absolute left-9 text-[13px] font-semibold text-gray-400">Check-in</span>
        )}
        <input
          type="date"
          min={today || undefined}
          value={checkIn}
          onChange={e => onCheckInChange(e.target.value)}
          onFocus={() => setCheckInFocus(true)}
          onBlur={() => setCheckInFocus(false)}
          aria-label="Check-in date"
          className={`text-[13px] font-semibold bg-transparent outline-none cursor-pointer w-[104px] ${checkIn || checkInFocus ? 'text-gray-900' : 'text-transparent'}`}
        />
      </label>

      {/* Check-out */}
      <label className="relative flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 cursor-pointer transition-colors flex-shrink-0">
        <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        {!checkOut && !checkOutFocus && (
          <span className="pointer-events-none absolute left-9 text-[13px] font-semibold text-gray-400">Check-out</span>
        )}
        <input
          type="date"
          min={checkIn ? nextDay(checkIn) : (today || undefined)}
          value={checkOut}
          onChange={e => onCheckOutChange(e.target.value)}
          onFocus={() => setCheckOutFocus(true)}
          onBlur={() => setCheckOutFocus(false)}
          aria-label="Check-out date"
          className={`text-[13px] font-semibold bg-transparent outline-none cursor-pointer w-[104px] ${checkOut || checkOutFocus ? 'text-gray-900' : 'text-transparent'}`}
        />
      </label>

      {/* Guests */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setGuestOpen(v => !v)}
          className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 w-full transition-colors"
        >
          <Users className="h-4 w-4 text-indigo-500 flex-shrink-0" />
          <span className={`text-[13px] font-semibold whitespace-nowrap ${hasGuests ? 'text-gray-900' : 'text-gray-400'}`}>
            {hasGuests ? `${guestSum} guest${guestSum !== 1 ? 's' : ''}` : 'Add guests'}
          </span>
        </button>

        {guestOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setGuestOpen(false)} />
            <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-64 z-30 space-y-5">
              <Counter label="Adults" sub="Age 18 and above" value={adults} min={0} max={30} onChange={setAdults} />
              <Counter
                label="Children"
                sub="Under 18"
                value={children}
                min={0}
                max={10}
                // A child can't be the only guest — bring an adult along.
                onChange={v => { setChildren(v); if (v > 0 && adults === 0) setAdults(1) }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearGuests}
                  disabled={!hasGuests}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setGuestOpen(false)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search button */}
      <button
        type="button"
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
      >
        <Search className="h-3.5 w-3.5" />
        Search Stays
      </button>
    </div>
  )
}

function Counter({ label, sub, value, min, max, onChange }: {
  label: string; sub: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
