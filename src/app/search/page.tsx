import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import HeroSearchBar from '@/app/HeroSearchBar'
import { pageMetadata } from '@/lib/seo'
import { tokenize, buildOrFilter, relevance, hasValidRange, nightsBetween, getBookedRoomIds } from '@/lib/search'
import SearchResultsClient, { type SearchHotel } from './SearchResultsClient'

export const metadata = pageMetadata({
  title: 'Search Hotels — Find Verified Stays by City & Date',
  description:
    'Search verified hotels by city, check-in and check-out dates and guest count. Compare live prices, ratings and amenities, then book in a few clicks.',
  path: '/search',
  noIndex: true,
})

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; check_in?: string; check_out?: string; guests?: string }>
}) {
  const { city, check_in, check_out, guests: guestsParam } = await searchParams
  const guests = Math.max(1, Number(guestsParam) || 1)

  const hasDates = hasValidRange(check_in, check_out)
  const supabase = await createAdminClient()

  let hotelQuery = supabase
    .from('hotels')
    .select('id, name, city, country, address, currency, rating, review_count, cover_image, images, amenities')
    .eq('status', 'active')
    .order('rating', { ascending: false })

  const tokens = tokenize(city ?? '')
  if (tokens.length) hotelQuery = hotelQuery.or(buildOrFilter(tokens))

  const { data: matchedHotels } = await hotelQuery
  const rawHotels = (matchedHotels ?? []) as Array<{
    id: string; name: string; city: string | null; country: string | null
    address: string | null; currency: string | null; rating: number
    review_count: number | null; cover_image: string | null
    images: string[] | null; amenities: string[] | null
  }>
  const hotelIds = rawHotels.map(h => h.id)

  const fromPriceByHotel = new Map<string, number>()
  const capacityByHotel  = new Map<string, number>()
  const bedsByHotel      = new Map<string, number>()

  if (hotelIds.length) {
    const hotelIdSet = new Set(hotelIds)

    // Fetch all available rooms without a hotel_id filter — avoids URL-length
    // limits when the matched hotel list is large (364+ IDs → GET query too long).
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, hotel_id, price_per_night, capacity, max_adults, max_children')
      .eq('status', 'available')

    // Only consider rooms that belong to hotels in our matched set.
    const relevantRooms = (rooms ?? []).filter(r => hotelIdSet.has(r.hotel_id))
    const relevantHotelIds = [...new Set(relevantRooms.map(r => r.hotel_id))]

    const bookedRoomIds = hasDates && relevantHotelIds.length
      ? await getBookedRoomIds(supabase, relevantHotelIds, check_in!, check_out!)
      : new Set<string>()

    for (const room of relevantRooms) {
      if (bookedRoomIds.has(room.id)) continue
      const prev = fromPriceByHotel.get(room.hotel_id)
      if (prev === undefined || room.price_per_night < prev) {
        fromPriceByHotel.set(room.hotel_id, room.price_per_night)
      }
      capacityByHotel.set(room.hotel_id, (capacityByHotel.get(room.hotel_id) ?? 0) + (room.capacity ?? 0))
      bedsByHotel.set(room.hotel_id, (bedsByHotel.get(room.hotel_id) ?? 0) + ((room.max_adults ?? 1) + (room.max_children ?? 0)))
    }
  }

  const results: SearchHotel[] = rawHotels
    .filter(h => fromPriceByHotel.has(h.id) && (capacityByHotel.get(h.id) ?? 0) >= guests)
    .sort((a, b) => relevance(a, tokens) - relevance(b, tokens) || b.rating - a.rating)
    .map(h => ({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      currency: h.currency,
      rating: h.rating,
      review_count: h.review_count,
      cover_image: h.cover_image,
      images: h.images,
      amenities: h.amenities,
      price: fromPriceByHotel.get(h.id) ?? 0,
      beds: bedsByHotel.get(h.id) ?? null,
    }))

  const nights = hasDates ? nightsBetween(check_in!, check_out!) : 0

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar />

      {/* Hero — matches the landing page hero in size and style */}
      <section className="relative z-10 bg-indigo-950">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2000&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/60 via-indigo-950/35 to-indigo-950/65" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            {city ? `Stays in ${city}` : 'Find your perfect stay'}
          </h1>
          <p className="mx-auto max-w-xl text-indigo-200 text-sm sm:text-base mb-8">
            {results.length > 0
              ? `${results.length} propert${results.length === 1 ? 'y' : 'ies'} available`
              : 'Search verified hotels across Pakistan'}
          </p>

          <div className="text-left">
            <HeroSearchBar
              defaultCity={city ?? ''}
              defaultCheckIn={check_in ?? ''}
              defaultCheckOut={check_out ?? ''}
              defaultAdults={guests}
              targetPath="/search"
            />
          </div>
        </div>
      </section>

      {/* Split layout: list + map */}
      <div className="flex flex-1">
        <SearchResultsClient
          hotels={results}
          hasDates={hasDates}
          checkIn={check_in}
          checkOut={check_out}
          guests={guests}
          city={city}
          nights={nights}
        />
      </div>

      <PublicFooter />
    </div>
  )
}
