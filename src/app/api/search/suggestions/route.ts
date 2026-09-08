import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { tokenize, buildOrFilter, relevance } from '@/lib/search'

/** Pulled from the DB before ranking. Wide enough that relevance has something
 *  to sort, short enough that the follow-up `.in()` stays a sane URL length. */
const MAX_CANDIDATES = 40
const MAX_HOTELS = 6
const MAX_CITIES = 4

const EMPTY = { hotels: [], cities: [] }

type Candidate = {
  id: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  rating: number | null
  cover_image: string | null
}

/**
 * Type-ahead for the destination field. Deliberately returns the same hotels the
 * /search page would list for that text — an active hotel with at least one
 * bookable room — so a suggestion never leads to an empty results page.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  const tokens = tokenize(q)
  if (!tokens.length) return NextResponse.json(EMPTY)

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country, address, rating, cover_image')
    .eq('status', 'active')
    .or(buildOrFilter(tokens))
    .limit(MAX_CANDIDATES)

  if (error) {
    // A dead type-ahead should not break the search bar, so fail quiet.
    console.error('[suggestions] hotel lookup failed:', error.message)
    return NextResponse.json(EMPTY)
  }

  const candidates = (data ?? []) as Candidate[]
  if (!candidates.length) return NextResponse.json(EMPTY)

  // Same rule the results page applies: a hotel with nothing bookable is
  // dropped there, so offering it here would send the guest to an empty page.
  const { data: rooms } = await supabase
    .from('rooms')
    .select('hotel_id')
    .eq('status', 'available')
    .in('hotel_id', candidates.map(h => h.id))

  const bookable = new Set((rooms ?? []).map(r => r.hotel_id))

  const ranked = candidates
    .filter(h => bookable.has(h.id))
    .sort((a, b) => relevance(a, tokens) - relevance(b, tokens) || (b.rating ?? 0) - (a.rating ?? 0))

  const hotels = ranked.slice(0, MAX_HOTELS).map(h => ({
    id: h.id,
    name: h.name,
    city: h.city,
    country: h.country,
    rating: h.rating,
    cover_image: h.cover_image,
  }))

  // Cities come from the same matched set, but only when the typed text looks
  // like the city itself. Without that check a hotel-name search would also
  // offer every town those hotels happen to sit in.
  const cities: string[] = []
  for (const hotel of ranked) {
    const city = hotel.city?.trim()
    if (!city) continue
    if (cities.some(c => c.toLowerCase() === city.toLowerCase())) continue
    if (!tokens.some(t => city.toLowerCase().includes(t))) continue
    cities.push(city)
    if (cities.length >= MAX_CITIES) break
  }

  return NextResponse.json({ hotels, cities })
}
