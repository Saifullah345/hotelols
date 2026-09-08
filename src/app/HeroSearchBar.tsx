'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, Search, Plus, Minus, Building2, Loader2, Star } from 'lucide-react'
import { addDays, todayISO } from '@/lib/date'

type HotelSuggestion = {
  id: string
  name: string
  city: string | null
  country: string | null
  rating: number | null
  cover_image: string | null
}

/** One row in the dropdown. Hotels open the property, cities re-run the search. */
type Suggestion =
  | { kind: 'hotel'; hotel: HotelSuggestion }
  | { kind: 'city'; city: string }

export default function HeroSearchBar({
  defaultCity = '',
  defaultCheckIn = '',
  defaultCheckOut = '',
  // 0 = nothing chosen yet. Guests stay unselected until the user picks a count.
  defaultAdults = 0,
  defaultChildren = 0,
  targetPath = '/',
}: {
  defaultCity?: string
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: number
  defaultChildren?: number
  /** Where to navigate on search. '/' goes to home#results, '/search' goes to the search page. */
  targetPath?: '/' | '/search'
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
  // Shown when Search is pressed with nothing filled in — see handleSearch.
  const [error, setError] = useState('')
  const cityRef = useRef<HTMLInputElement>(null)

  // Destination type-ahead. `open` is driven by typing and focus rather than by
  // the result count, so "Searching…" and "No matches" can both be shown.
  const [items,     setItems]     = useState<Suggestion[]>([])
  const [openList,  setOpenList]  = useState(false)
  const [searching, setSearching] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const destRef = useRef<HTMLDivElement>(null)

  // Resolved after mount: "today" depends on the viewer's timezoneand
  // rendering it during SSR would make the server markup disagree on hydration.
  const [today, setToday] = useState('')
  useEffect(() => { setToday(todayISO()) }, [])

  // Type-ahead lookup. Only runs while the list is open, so the prefilled city
  // on /search does not fire a request nobody asked for on mount. The abort
  // keeps a slow early keystroke from overwriting a later, more specific reply.
  useEffect(() => {
    const term = city.trim()
    if (!openList || term.length < 2) {
      setItems([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    setSearching(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        const data = await res.json() as { hotels?: HotelSuggestion[]; cities?: string[] }
        setItems([
          ...(data.hotels ?? []).map(hotel => ({ kind: 'hotel', hotel }) as const),
          ...(data.cities ?? []).map(name  => ({ kind: 'city', city: name }) as const),
        ])
        setHighlight(-1)
      } catch {
        // An abort is the normal case here, and a failed lookup should leave the
        // bar usable rather than shouting at someone who is still typing.
        if (!controller.signal.aborted) setItems([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => { clearTimeout(timer); controller.abort() }
  }, [city, openList])

  // Close the list on a click outside it — a full-screen catcher would swallow
  // the first click on the date fields sitting right next to it.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setOpenList(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const guestSum    = adults + children
  const hasGuests   = guestSum > 0

  const nextDay = (date: string) => addDays(date, 1)

  // A stay needs both ends of the range to be searchable, so picking one date
  // fills in the other rather than silently dropping the filter.
  const onCheckInChange = (value: string) => {
    setCheckIn(value)
    setError('')
    if (value && (!checkOut || checkOut <= value)) setCheckOut(nextDay(value))
  }

  const onCheckOutChange = (value: string) => {
    setCheckOut(value)
    setError('')
    if (value && checkIn && value <= checkIn) setCheckIn('')
  }

  /** The dates and party size, shared by a search and by opening one hotel. */
  const stayParams = () => {
    const p = new URLSearchParams()
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
    return p
  }

  // `term` lets a picked suggestion search on its own text — setCity would not
  // have landed yet by the time this runs.
  const handleSearch = (term: string = city) => {
    setOpenList(false)

    const p = stayParams()
    if (term.trim()) p.set('city', term.trim())
    const qs = p.toString()

    // Nothing to search on. Navigating anyway just reloads the page the guest is
    // already looking at, which reads as a broken button — say what is missing
    // and put the cursor where they can fix it instead.
    if (!qs) {
      setError('Enter a city or hotel name, or pick your dates, to search.')
      cityRef.current?.focus()
      return
    }

    if (targetPath === '/search') {
      router.push(`/search?${qs}`)
    } else {
      // #results jumps past the hero so the guest lands on what they searched for.
      router.push(`/?${qs}#results`)
    }
  }

  /** Picking a hotel opens it directly, carrying the stay across so its room
   *  list is already filtered to those dates. A city just runs the search. */
  const pick = (item: Suggestion) => {
    setOpenList(false)
    setError('')

    if (item.kind === 'city') {
      setCity(item.city)
      handleSearch(item.city)
      return
    }

    setCity(item.hotel.name)
    const qs = stayParams().toString()
    router.push(qs ? `/hotels/${item.hotel.id}?${qs}` : `/hotels/${item.hotel.id}`)
  }

  const onDestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return
      e.preventDefault()
      setOpenList(true)
      setHighlight(i => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        return (next + items.length) % items.length
      })
      return
    }

    if (e.key === 'Escape') {
      setOpenList(false)
      return
    }

    if (e.key === 'Enter') {
      // Enter takes the highlighted suggestion when there is one, and otherwise
      // searches on whatever was typed — so the bar still works untouched.
      if (openList && highlight >= 0 && items[highlight]) {
        e.preventDefault()
        pick(items[highlight])
      } else {
        handleSearch()
      }
    }
  }

  const clearGuests = () => {
    setAdults(0)
    setChildren(0)
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-lg p-1.5 flex flex-col lg:flex-row gap-1.5">

        {/* One line per field — the stacked caption above each value is what made
            the bar twice an input's height. Captions that are still needed now sit
            inline; the rest is carried by the placeholder. */}

        {/* Destination */}
        {/* The list is a sibling of the label, not a child: a button nested in a
            label steals its own click to focus the input. */}
        <div ref={destRef} className="relative flex-1 min-w-0">
          <label className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2.5 cursor-text transition-colors min-w-0">
            <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <input
              ref={cityRef}
              value={city}
              onChange={e => { setCity(e.target.value); setError(''); setOpenList(true); setHighlight(-1) }}
              onFocus={() => { if (city.trim().length >= 2) setOpenList(true) }}
              onKeyDown={onDestKeyDown}
              placeholder="City or hotel name"
              aria-label="Destination"
              role="combobox"
              aria-expanded={openList}
              aria-autocomplete="list"
              aria-controls="destination-suggestions"
              autoComplete="off"
              className="w-full min-w-0 text-[13px] font-semibold text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
          </label>

            {openList && city.trim().length >= 2 && (
              <div
                id="destination-suggestions"
                role="listbox"
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-30 max-h-80 overflow-y-auto"
              >
                {items.map((item, index) => {
                  const active = index === highlight
                  const key = item.kind === 'hotel' ? `h-${item.hotel.id}` : `c-${item.city}`
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      // mousedown, not click: the input's blur would otherwise tear
                      // the row out from under the pointer before it lands.
                      onMouseDown={e => { e.preventDefault(); pick(item) }}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      {item.kind === 'hotel' ? (
                        <>
                          {item.hotel.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.hotel.cover_image}
                              alt=""
                              className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                              <Building2 className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-gray-900">{item.hotel.name}</span>
                            <span className="block truncate text-[11px] text-gray-400">
                              {[item.hotel.city, item.hotel.country].filter(Boolean).join(', ') || 'Hotel'}
                            </span>
                          </span>
                          {item.hotel.rating ? (
                            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold text-gray-500">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {item.hotel.rating.toFixed(1)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-gray-900">{item.city}</span>
                            <span className="block text-[11px] text-gray-400">Search all stays in this city</span>
                          </span>
                        </>
                      )}
                    </button>
                  )
                })}

                {!items.length && (
                  <p className="px-3 py-2.5 text-[13px] font-medium text-gray-400">
                    {searching ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                      </span>
                    ) : (
                      'No stays match that yet.'
                    )}
                  </p>
                )}
              </div>
            )}
        </div>

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
                <Counter
                  label="Adults"
                  sub="Age 18 and above"
                  value={adults}
                  min={0}
                  max={30}
                  onChange={v => { setAdults(v); setError('') }}
                />
                <Counter
                  label="Children"
                  sub="Under 18"
                  value={children}
                  min={0}
                  max={10}
                  // A child can't be the only guest — bring an adult along.
                  onChange={v => { setChildren(v); setError(''); if (v > 0 && adults === 0) setAdults(1) }}
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
          onClick={() => handleSearch()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
        >
          <Search className="h-3.5 w-3.5" />
          Search Stays
        </button>
      </div>

      {/* Both heroes that host this bar are dark, so the message carries its own
          background rather than relying on the backdrop for contrast. */}
      {error && (
        <p
          role="alert"
          className="mt-2 inline-flex items-center rounded-lg bg-red-500/95 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm"
        >
          {error}
        </p>
      )}
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
