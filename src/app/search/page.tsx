import { createAdminClient } from '@/lib/supabase/server'
import { MapPin, Star, ArrowRight, CalendarDays, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import PublicNavbar from '@/components/layout/PublicNavbar'
import HotelSearchBar from '@/components/landing/HotelSearchBar'
import { pageMetadata } from '@/lib/seo'
import { formatCurrency } from '@/lib/currency'
import { tokenize, buildOrFilter, relevance, hasValidRange, nightsBetween, getBookedRoomIds } from '@/lib/search'

// noIndex: every filter combination is a near-duplicate of the landing page.
// follow stays on so crawlers still reach the hotel detail pages from here.
export const metadata = pageMetadata({
  title: 'Search Hotels — Find Verified Stays by City & Date',
  description:
    'Search verified hotels by city, check-in and check-out dates, and guest count. Compare live prices, ratings and amenities, then book in a few clicks.',
  path: '/search',
  noIndex: true,
})

type HotelRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  currency: string | null
  rating: number
  cover_image: string | null
  amenities: string[] | null
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; check_in?: string; check_out?: string; guests?: string }>
}) {
  const { city, check_in, check_out, guests: guestsParam } = await searchParams
  const guests = Math.max(1, Number(guestsParam) || 1)

  // Valid date range = both provided and check-out strictly after check-in.
  const hasDates = hasValidRange(check_in, check_out)

  // Service role: public browsing bypasses RLS but we only ever expose active
  // hotels and minimal room info — never private guest/booking data.
  const supabase = await createAdminClient()

  let hotelQuery = supabase
    .from('hotels')
    .select('id, name, city, country, address, currency, rating, cover_image, amenities')
    .eq('status', 'active')
    .order('rating', { ascending: false })

  // Matched token by token so multi-word destinations still find their city.
  const tokens = tokenize(city ?? '')
  if (tokens.length) hotelQuery = hotelQuery.or(buildOrFilter(tokens))

  const { data: matchedHotels } = await hotelQuery
  const hotels = (matchedHotels ?? []) as HotelRow[]
  const hotelIds = hotels.map(h => h.id)

  // For each hotel, find rooms that are free for the chosen dates, then keep
  // only hotels whose free rooms can seat the whole party between them.
  const fromPriceByHotel = new Map<string, number>()
  const capacityByHotel = new Map<string, number>()

  if (hotelIds.length) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, hotel_id, price_per_night, capacity')
      .in('hotel_id', hotelIds)
      .eq('status', 'available')

    const bookedRoomIds = hasDates
      ? await getBookedRoomIds(supabase, hotelIds, check_in!, check_out!)
      : new Set<string>()

    for (const room of rooms ?? []) {
      if (bookedRoomIds.has(room.id)) continue
      const prev = fromPriceByHotel.get(room.hotel_id)
      if (prev === undefined || room.price_per_night < prev) {
        fromPriceByHotel.set(room.hotel_id, room.price_per_night)
      }
      capacityByHotel.set(room.hotel_id, (capacityByHotel.get(room.hotel_id) ?? 0) + (room.capacity ?? 0))
    }
  }

  const results = hotels
    .filter(h => fromPriceByHotel.has(h.id) && (capacityByHotel.get(h.id) ?? 0) >= guests)
    .sort((a, b) => relevance(a, tokens) - relevance(b, tokens) || b.rating - a.rating)
  const count = results.length

  const nights = hasDates ? nightsBetween(check_in!, check_out!) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      {/* Search hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-6 pb-10 pt-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Search hotels</h1>
          <p className="mt-1 text-sm text-primary-100">Browse and compare stays — no sign-up needed to explore.</p>
          <div className="mt-5">
            <HotelSearchBar city={city} checkIn={check_in} checkOut={check_out} guests={guests} />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{count} {count === 1 ? 'hotel' : 'hotels'}</span>
          <span>found</span>
          {city && <span>in “{city}”</span>}
          {hasDates && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-primary-600" />
              {check_in} → {check_out} · {nights} night{nights === 1 ? '' : 's'}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm">
            <Users className="h-3.5 w-3.5 text-primary-600" /> {guests} guest{guests === 1 ? '' : 's'}
          </span>
        </div>

        {count > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(hotel => (
              <Link
                key={hotel.id}
                href={`/hotels/${hotel.id}${hasDates ? `?check_in=${check_in}&check_out=${check_out}&adults=${guests}` : ''}`}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200">
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
                    {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                  </p>

                  {hotel.amenities && hotel.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {hotel.amenities.slice(0, 3).map(a => (
                        <span key={a} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{a}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-500">
                      from <span className="text-base font-bold text-gray-900">{formatCurrency(fromPriceByHotel.get(hotel.id) ?? 0, hotel.currency ?? 'PKR')}</span>/night
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-transform group-hover:translate-x-0.5">
                      View &amp; book <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">🔍</div>
            <p className="text-lg font-medium text-gray-900">No hotels found</p>
            <p className="mt-1 text-sm text-gray-500">
              {hasDates
                ? 'Try different dates, a smaller party, or another destination.'
                : 'Try another destination or fewer guests.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
