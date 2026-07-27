import { MapPin, CalendarDays, Users, Search } from 'lucide-react'

interface Props {
  city?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  /** Extra classes for the outer form (e.g. shadow/spacing tweaks per page). */
  className?: string
}

/**
 * Public hotel search bar — Destination, Check-in, Check-out, Guests.
 * Plain GET form so it works without client JS and is shareable via URL.
 * Submits to the public /search results page.
 */
export default function HotelSearchBar({ city, checkIn, checkOut, guests, className = '' }: Props) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <form
      method="get"
      action="/search"
      className={`grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-xl sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] sm:items-center ${className}`}
    >
      {/* Destination */}
      <label className="flex items-center gap-2 rounded-xl px-3 py-2">
        <MapPin className="h-5 w-5 flex-shrink-0 text-primary-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Destination</span>
          <input
            name="city"
            defaultValue={city}
            placeholder="City or hotel name"
            className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </span>
      </label>

      {/* Check-in */}
      <label className="flex items-center gap-2 rounded-xl px-3 py-2 sm:border-l sm:border-gray-100">
        <CalendarDays className="h-5 w-5 flex-shrink-0 text-primary-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Check-in</span>
          <input
            type="date"
            name="check_in"
            min={today}
            defaultValue={checkIn}
            className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
          />
        </span>
      </label>

      {/* Check-out */}
      <label className="flex items-center gap-2 rounded-xl px-3 py-2 sm:border-l sm:border-gray-100">
        <CalendarDays className="h-5 w-5 flex-shrink-0 text-primary-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Check-out</span>
          <input
            type="date"
            name="check_out"
            min={checkIn || today}
            defaultValue={checkOut}
            className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
          />
        </span>
      </label>

      {/* Guests */}
      <label className="flex items-center gap-2 rounded-xl px-3 py-2 sm:border-l sm:border-gray-100">
        <Users className="h-5 w-5 flex-shrink-0 text-primary-600" />
        <span className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guests</span>
          <input
            type="number"
            name="guests"
            min={1}
            max={30}
            defaultValue={guests ?? 1}
            className="w-16 border-0 bg-transparent p-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
          />
        </span>
      </label>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
      >
        <Search className="h-4 w-4" /> Search
      </button>
    </form>
  )
}
