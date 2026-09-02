export const revalidate = 60

import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import HeroSearchBar from './HeroSearchBar'
import HotelCarousel from './HotelCarousel'
import GuestReviews from '@/components/landing/GuestReviews'
import OwnerCta from '@/components/landing/OwnerCta'
import SaveHotelButton from '@/components/SaveHotelButton'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl } from '@/lib/seo'
import { formatCurrency } from '@/lib/currency'
import { tokenize, buildOrFilter, relevance, hasValidRange, nightsBetween, getBookedRoomIds } from '@/lib/search'
import { getSubscription } from '@/lib/subscription'
import { MapPin, Star, Wifi, Car, Coffee, Building2, ChevronRight } from 'lucide-react'

// Hero backdrop. Swap this for your own shot by dropping the file in public/
// and pointing at it ('/hero.jpg') — nothing else in the section depends on it.
// images.unsplash.com is already allowed in next.config.ts remotePatterns.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=70'

type Hotel = {
  id: string
  name: string
  city: string
  country: string
  address: string | null
  currency: string | null
  cover_image: string | null
  rating: number | null
  amenities: string[] | null
  review_count: number | null
  min_price?: number
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string
    check_in?: string
    check_out?: string
    adults?: string
    children?: string
  }>
}) {
  const { city, check_in, check_out, adults, children } = await searchParams

  const authSupabase = await createClient()
  const supabase = await createAdminClient()

  // Who's asking doesn't change which hotels are listed, so the session lookup
  // and the search run side by side instead of one after the other. Started
  // here, awaited below — the redirect still happens before anything renders.
  const identity = getAuthContext()

  // The field is labelled "City or hotel name", so match every location column.
  // Multi-word entries are matched token by token — "wah place" has to be able
  // to find a hotel in "Wah", which a whole-phrase ILIKE never would.
  const tokens = tokenize(city ?? '')

  // Party sizeand the date range once it's complete enough to check against.
  const guests = Math.max(0, (Number(adults) || 0) + (Number(children) || 0))
  const datesApplied = hasValidRange(check_in, check_out)
  const filtersApplied = tokens.length > 0 || datesApplied || guests > 0

  let q = supabase
    .from('hotels')
    .select('id, name, city, country, address, currency, cover_image, rating, amenities, review_count, subscription_status, plan_expires_at, plan:plans(feature_listing)')
    .eq('status', 'active')
    .order('rating', { ascending: false, nullsFirst: false })
    // Room-level filters run below, so fetch a wider pool when searching and
    // trim to the display count afterwards.
    .limit(filtersApplied ? 60 : 24)

  if (tokens.length) q = q.or(buildOrFilter(tokens))

  const [{ data: hotels }, { user, role }] = await Promise.all([q, identity])
  const isLoggedIn = !!user

  // Admins and staff have their own dashboards — redirect them away from the
  // customer-facing landing page so they can't accidentally book rooms.
  if (role === 'hotel_admin') redirect('/hotel-admin/dashboard')
  if (role === 'super_admin') redirect('/super-admin/dashboard')
  if (role === 'staff')       redirect('/staff/dashboard')

  const matchedIds = (hotels ?? []).map(h => h.id)

  // Rooms that could host this stay, the rooms already taken for the requested
  // nightsand the viewer's saved list all key off the same hotel ids, so they
  // go out together rather than in a three-step chain. Saved hotels are fetched
  // for the whole matched set — a superset of what ends up on screenand
  // cheaper than waiting for the filter to finish first.
  const [roomsResult, bookedRoomIds, savedResult] = await Promise.all([
    matchedIds.length
      ? supabase
          .from('rooms')
          .select('id, hotel_id, price_per_night, capacity')
          .in('hotel_id', matchedIds)
          .eq('status', 'available')
      : Promise.resolve({ data: [] as { id: string; hotel_id: string; price_per_night: number; capacity: number }[] }),
    datesApplied
      ? getBookedRoomIds(supabase, matchedIds, check_in!, check_out!)
      : Promise.resolve(new Set<string>()),
    user && matchedIds.length
      ? authSupabase.from('saved_hotels').select('hotel_id').eq('user_id', user.id).in('hotel_id', matchedIds)
      : Promise.resolve({ data: [] as { hotel_id: string }[] }),
  ])
  const roomRows = roomsResult.data

  // Cheapest free room per hotel + total free capacity, so a party of 4 still
  // sees a hotel offering two doubles rather than only 4-bed rooms.
  const minPriceMap: Record<string, number> = {}
  const freeCapacity: Record<string, number> = {}
  for (const room of roomRows ?? []) {
    if (bookedRoomIds.has(room.id)) continue
    if (minPriceMap[room.hotel_id] === undefined || room.price_per_night < minPriceMap[room.hotel_id]) {
      minPriceMap[room.hotel_id] = room.price_per_night
    }
    freeCapacity[room.hotel_id] = (freeCapacity[room.hotel_id] ?? 0) + (room.capacity ?? 0)
  }

  const hotelList: Hotel[] = (hotels ?? [])
    .filter(h => {
      // Hide hotels whose plan has listing disabled (feature_listing = false).
      // If the column doesn't exist yet (pre-migration), the field is undefined → allow.
      const plan = (h as any).plan
      if (plan && plan.feature_listing === false) return false
      // A lapsed subscription takes the hotel off the public site. Hotels with
      // no subscription on record are legacy and stay listed.
      if (!getSubscription(h).publiclyVisible) return false
      // Without dates or a party size, keep listing hotels that have no rooms
      // loaded yet — they still deserve a browse. Once the guest asks for
      // something specific, only hotels that can honour it are shown.
      if (datesApplied && minPriceMap[h.id] === undefined) return false
      if (guests > 0 && (freeCapacity[h.id] ?? 0) < guests) return false
      return true
    })
    .map(h => ({ ...h, min_price: minPriceMap[h.id] }))
    .sort(
      (a, b) =>
        relevance(a, tokens) - relevance(b, tokens) ||
        (a.cover_image ? 0 : 1) - (b.cover_image ? 0 : 1) ||
        (b.rating ?? 0) - (a.rating ?? 0)
    )
    .slice(0, 24)

  const savedSet = new Set<string>((savedResult.data ?? []).map(s => s.hotel_id))

  const hasFilter = filtersApplied
  const nightCount = datesApplied ? nightsBetween(check_in!, check_out!) : 0

  // Identical on every card: carry whatever the guest actually chose into the
  // hotel page so the dates and party size survive the click.
  const cardParams = new URLSearchParams()
  if (check_in) cardParams.set('check_in', check_in)
  if (check_out) cardParams.set('check_out', check_out)
  if (adults) cardParams.set('adults', adults)
  if (children) cardParams.set('children', children)
  const cardQuery = cardParams.toString() ? `?${cardParams.toString()}` : ''

  const toCard = (h: Hotel) => ({
    id: h.id,
    name: h.name,
    city: h.city,
    country: h.country,
    cover_image: h.cover_image,
    rating: h.rating,
    review_count: h.review_count,
    href: `/hotels/${h.id}${cardQuery}`,
    saved: savedSet.has(h.id),
  })

  // Lets search engines see the featured stays as a ranked list of Hotel entities.
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: hasFilter && city ? `Hotels in ${city}` : 'Top-rated stays on BookQayam',
    numberOfItems: hotelList.length,
    itemListElement: hotelList.map((h, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Hotel',
        name: h.name,
        url: absoluteUrl(`/hotels/${h.id}`),
        ...(h.cover_image ? { image: h.cover_image } : {}),
        address: {
          '@type': 'PostalAddress',
          ...(h.city ? { addressLocality: h.city } : {}),
          ...(h.country ? { addressCountry: h.country } : {}),
        },
        ...(h.review_count && h.rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(h.rating),
                reviewCount: h.review_count,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={itemListSchema} />
      <PublicNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      {/* No overflow-hidden here — it would clip the guests dropdown. z-10 keeps
          that dropdown above the hotel grid section that follows. */}
      <section className="relative z-10 bg-indigo-950">
        {/* Photo backdrop. Its own wrapper does the clipping so the section itself
            can still let the guests dropdown overflowand the indigo wash on top
            keeps the headline readable whatever the photo is doing underneath. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/60 via-indigo-950/35 to-indigo-950/65" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-32 pb-36 text-center">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            Every trip deserves<br />
            <span className="text-amber-400">a great stay.</span>
          </h1>
          <p className="mx-auto max-w-xl text-indigo-200 text-sm sm:text-base mb-7">
            Browse verified hotels, pick your datesand book in minutes — no sign-up needed to explore.
          </p>

          {/* Search form */}
          {/* key: remounts the bar whenever the URL params change, so "Clear ×"
              actually empties the fields instead of leaving stale client state. */}
          <div className="text-left">
            <HeroSearchBar
              key={`${city ?? ''}|${check_in ?? ''}|${check_out ?? ''}|${adults ?? ''}|${children ?? ''}`}
              defaultCity={city}
              defaultCheckIn={check_in}
              defaultCheckOut={check_out}
              defaultAdults={adults ? Number(adults) : 0}
              defaultChildren={children ? Number(children) : 0}
            />
          </div>
        </div>
      </section>

      {/* ── Hotel grid ───────────────────────────────────────────────── */}
      <section id="results" className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12 scroll-mt-4">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {hasFilter
                ? city?.trim() ? `Hotels in ${city.trim()}` : 'Search results'
                : 'Top-rated stays'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {hasFilter
                ? [
                    `${hotelList.length} ${hotelList.length === 1 ? 'stay' : 'stays'}`,
                    datesApplied
                      ? `${new Date(check_in!).toLocaleDateString('en', { day: 'numeric', month: 'short' })} – ${new Date(check_out!).toLocaleDateString('en', { day: 'numeric', month: 'short' })} · ${nightCount} night${nightCount === 1 ? '' : 's'}`
                      : null,
                    guests > 0 ? `${guests} guest${guests === 1 ? '' : 's'}` : null,
                  ].filter(Boolean).join(' · ')
                : 'Handpicked properties for you'}
            </p>
          </div>
          {hasFilter ? (
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Clear ×
            </Link>
          ) : null}
        </div>

        {hotelList.length === 0 ? (
          <div className="py-24 text-center">
            <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No hotels found</p>
            <p className="text-gray-400 text-sm mt-1">
              {datesApplied || guests > 0
                ? 'Nothing free for those dates and guests. Try shifting your dates, fewer guests, or another destination.'
                : 'Try a different city or clear your search.'}
            </p>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-indigo-600 hover:underline">Browse all hotels</Link>
          </div>
        ) : !hasFilter ? (
          <HotelCarousel isLoggedIn={isLoggedIn} hotels={hotelList.slice(0, 4).map(toCard)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {hotelList.map(hotel => {
              const nights = nightCount || null
              const amenities = (hotel.amenities ?? []).slice(0, 2)
              // Carry only the params the guest actually chose.
              const hp = new URLSearchParams()
              if (check_in) hp.set('check_in', check_in)
              if (check_out) hp.set('check_out', check_out)
              if (adults) hp.set('adults', adults)
              if (children) hp.set('children', children)
              const href = `/hotels/${hotel.id}${hp.toString() ? `?${hp.toString()}` : ''}`
              return (
                // Wrapper div — heart button is a sibling of Link so clicks never bubble into Link
                <div key={hotel.id} className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1">
                  <Link href={href} className="flex flex-col flex-1">
                    <div className="relative aspect-[4/3] bg-indigo-100 overflow-hidden flex-shrink-0">
                      {/* No cover yet: a house illustration reads as "photo pending",
                          where the old initial-on-a-gradient read as a broken card. */}
                      <Image
                        src={hotel.cover_image || '/hotel-placeholder.svg'}
                        alt={hotel.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Rating — top left */}
                      {hotel.rating ? (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(hotel.rating).toFixed(1)}
                          {hotel.review_count ? <span className="font-normal text-gray-400 ml-0.5">({hotel.review_count})</span> : null}
                        </div>
                      ) : null}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 p-4 gap-3">
                      <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-indigo-700 transition-colors line-clamp-1">
                        {hotel.name}
                      </h3>
                      {amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {amenities.map(a => (
                            <span key={a} className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                              {a.toLowerCase().includes('wifi') && <Wifi className="h-3 w-3" />}
                              {a.toLowerCase().includes('park') && <Car className="h-3 w-3" />}
                              {a.toLowerCase().includes('breakfast') && <Coffee className="h-3 w-3" />}
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                        <div>
                          {hotel.min_price ? (
                            <>
                              <p className="text-[11px] text-gray-400 leading-none mb-0.5">
                                {nights ? `${nights} night${nights > 1 ? 's' : ''} from` : 'from'}
                              </p>
                              <p className="text-lg font-extrabold text-gray-900 leading-none">
                                {formatCurrency(nights ? hotel.min_price * nights : hotel.min_price, hotel.currency ?? 'PKR')}
                                {!nights && <span className="text-sm font-normal text-gray-400"> /night</span>}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400">Price on request</p>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Heart button — outside Link so it never triggers card navigation */}
                  <div className="absolute top-3 right-3 z-10">
                    <SaveHotelButton
                      hotelId={hotel.id}
                      initialSaved={savedSet.has(hotel.id)}
                      isLoggedIn={isLoggedIn}
                      variant="card"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </section>

      {/* ── Unique stays ─────────────────────────────────────────────── */}
      {/* Every listed property, not just the four the section above features. */}
      {!hasFilter && hotelList.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-12">
          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-gray-900">Unique stays</h2>
            <p className="text-sm text-gray-400 mt-1">Every property on BookQayam</p>
          </div>

          <HotelCarousel variant="compact" autoplay isLoggedIn={isLoggedIn} hotels={hotelList.map(toCard)} />

          <div className="mt-8 text-center">
            <Link
              href="/?city="
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
            >
              View all stays <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Guest reviews ────────────────────────────────────────────── */}
      {!hasFilter && <GuestReviews />}

      {/* ── For hotel owners banner ──────────────────────────────────── */}
      {/* The collage runs on real listing covers, so it fills in on its own as
          hotels join; OwnerCta tops it up with stock only where they run out. */}
      <OwnerCta
        covers={hotelList
          .map(h => h.cover_image)
          .filter((src): src is string => Boolean(src))
          .slice(0, 6)}
      />

      <PublicFooter />
    </div>
  )
}
