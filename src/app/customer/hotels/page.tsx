import { createClient } from '@/lib/supabase/server'
import { MapPin, Star, Search, SlidersHorizontal, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import GuestsRoomsSelector from './GuestsRoomsSelector'

export const metadata = { title: 'Search Hotels' }

export default async function CustomerHotelsPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; q?: string; adults?: string; children?: string; rooms?: string }>
}) {
  const { city, q, adults: adultsParam, children: childrenParam, rooms: roomsParam } = await searchParams
  const adults = Math.max(1, Number(adultsParam) || 2)
  const children = Math.max(0, Number(childrenParam) || 0)
  const roomsNeeded = Math.max(1, Number(roomsParam) || 1)
  const totalGuests = adults + children
  const supabase = await createClient()

  let query = supabase
    .from('hotels')
    .select('*, plan:plans(name)')
    .eq('status', 'active')
    .order('rating', { ascending: false })

  if (city) query = query.ilike('city', `%${city}%`)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: hotelsMatchingSearch } = await query

  // Only keep hotels that can actually accommodate the requested party: at
  // least `roomsNeeded` available rooms whose room type sleeps `totalGuests`.
  let hotels = hotelsMatchingSearch
  const hotelIds = (hotelsMatchingSearch ?? []).map(h => h.id)
  if (hotelIds.length) {
    const { data: candidateRooms } = await supabase
      .from('rooms')
      .select('hotel_id, room_type:room_types(capacity)')
      .in('hotel_id', hotelIds)
      .eq('status', 'available')

    const suitableRoomCountByHotel = new Map<string, number>()
    for (const room of candidateRooms ?? []) {
      const capacity = (room.room_type as { capacity?: number } | null)?.capacity ?? 0
      if (capacity >= totalGuests) {
        suitableRoomCountByHotel.set(room.hotel_id, (suitableRoomCountByHotel.get(room.hotel_id) ?? 0) + 1)
      }
    }
    hotels = (hotelsMatchingSearch ?? []).filter(h => (suitableRoomCountByHotel.get(h.id) ?? 0) >= roomsNeeded)
  }

  const count = hotels?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-primary-400/20 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {count} {count === 1 ? 'stay' : 'stays'} available
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Find your perfect stay
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-primary-100 sm:text-base">
            Browse handpicked hotels, compare rooms, and book in a few taps.
          </p>

          {/* Search */}
          <form method="get" className="mt-6 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={q}
                className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="Hotel name…"
              />
            </div>
            <div className="relative flex-1 sm:max-w-[12rem] sm:border-l sm:border-gray-100">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="city"
                defaultValue={city}
                className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="City"
              />
            </div>
            <GuestsRoomsSelector defaultAdults={adults} defaultChildren={children} defaultRooms={roomsNeeded} />
            <button type="submit" className="btn-primary px-6">Search</button>
          </form>
          {(q || city) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-primary-100">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                Showing results{q ? ` for “${q}”` : ''}{city ? ` in ${city}` : ''}.
              </span>
              <Link href="/customer/hotels" className="font-semibold text-white underline underline-offset-2">
                Clear
              </Link>
            </div>
          )}
          <p className="mt-3 text-xs text-primary-100">
            {adults} adult{adults === 1 ? '' : 's'}
            {children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''} · {roomsNeeded} room{roomsNeeded === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      {/* Results */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {hotels?.map(hotel => (
          <Link
            key={hotel.id}
            href={`/customer/hotels/${hotel.id}`}
            className="group card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200">
              {hotel.cover_image ? (
                <Image
                  src={hotel.cover_image}
                  alt={hotel.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl">🏨</div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                {hotel.rating.toFixed(1)}
              </div>
            </div>

            <div className="p-5">
              <h3 className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-primary-700">
                {hotel.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {hotel.city}, {hotel.country}
              </p>

              {hotel.amenities?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hotel.amenities.slice(0, 3).map((a: string) => (
                    <span key={a} className="badge-gray text-xs">{a}</span>
                  ))}
                  {hotel.amenities.length > 3 && (
                    <span className="badge-gray text-xs">+{hotel.amenities.length - 3}</span>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-xs text-gray-500">Check-in {hotel.check_in_time?.slice(0, 5)}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-transform group-hover:translate-x-0.5">
                  View rooms <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}

        {!count && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">🔍</div>
            <p className="text-lg font-medium text-gray-900">No hotels found</p>
            <p className="mt-1 text-sm text-gray-500">Try a different name or city.</p>
            {(q || city) && (
              <Link href="/customer/hotels" className="btn-secondary mt-6 inline-flex">Clear search</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
