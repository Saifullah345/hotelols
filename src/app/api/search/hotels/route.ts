import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { tokenize, buildOrFilter, relevance, hasValidRange, getBookedRoomIds } from '@/lib/search'

const PAGE_SIZE = 12

export async function GET(request: Request) {
  const url = new URL(request.url)
  const city    = url.searchParams.get('city') ?? ''
  const checkIn  = url.searchParams.get('check_in') ?? undefined
  const checkOut = url.searchParams.get('check_out') ?? undefined
  const guests  = Math.max(1, Number(url.searchParams.get('guests')) || 1)
  const offset  = Math.max(0, Number(url.searchParams.get('offset')) || 0)

  const supabase = await createAdminClient()
  const hasDates = hasValidRange(checkIn, checkOut)

  let hotelQuery = supabase
    .from('hotels')
    .select('id, name, city, country, address, currency, rating, review_count, cover_image, images, amenities')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const tokens = tokenize(city)
  if (tokens.length) hotelQuery = hotelQuery.or(buildOrFilter(tokens))

  const { data: matchedHotels, error } = await hotelQuery
  if (error) return NextResponse.json({ hotels: [], hasMore: false })

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
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, hotel_id, price_per_night, capacity, max_adults, max_children')
      .eq('status', 'available')
      .in('hotel_id', hotelIds)

    const bookedRoomIds = hasDates && hotelIds.length
      ? await getBookedRoomIds(supabase, hotelIds, checkIn!, checkOut!)
      : new Set<string>()

    for (const room of (rooms ?? []) as { id: string; hotel_id: string; price_per_night: number; capacity: number; max_adults: number; max_children: number }[]) {
      if (bookedRoomIds.has(room.id)) continue
      const prev = fromPriceByHotel.get(room.hotel_id)
      if (prev === undefined || room.price_per_night < prev) {
        fromPriceByHotel.set(room.hotel_id, room.price_per_night)
      }
      capacityByHotel.set(room.hotel_id, (capacityByHotel.get(room.hotel_id) ?? 0) + (room.capacity ?? 0))
      bedsByHotel.set(room.hotel_id, (bedsByHotel.get(room.hotel_id) ?? 0) + ((room.max_adults ?? 1) + (room.max_children ?? 0)))
    }
  }

  const results = rawHotels
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

  return NextResponse.json(
    { hotels: results, hasMore: rawHotels.length === PAGE_SIZE },
    { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } },
  )
}
