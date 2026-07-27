import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import HeroSearchBar from './HeroSearchBar'
import SaveHotelButton from '@/components/SaveHotelButton'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl } from '@/lib/seo'
import { MapPin, Star, Wifi, Car, Coffee, Building2, ChevronRight } from 'lucide-react'

type Hotel = {
  id: string
  name: string
  city: string
  country: string
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
  const { data: { user } } = await authSupabase.auth.getUser()
  const isLoggedIn = !!user

  const supabase = await createAdminClient()

  // The field is labelled "City or hotel name", so match all three columns —
  // matching only `city` is why hotel-name searches came back empty.
  const term = (city ?? '').trim()
  // PostgREST parses `,` `(` `)` as filter syntax inside .or(), so strip them.
  const safeTerm = term.replace(/[(),*%\\]/g, ' ').trim()

  let q = supabase
    .from('hotels')
    .select('id, name, city, country, cover_image, rating, amenities, review_count')
    .eq('status', 'active')
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(safeTerm ? 24 : 9)

  if (safeTerm) {
    q = q.or(`name.ilike.%${safeTerm}%,city.ilike.%${safeTerm}%,country.ilike.%${safeTerm}%`)
  }

  const { data: hotels } = await q

  const ids = (hotels ?? []).map(h => h.id)
  const { data: prices } = ids.length
    ? await supabase.from('rooms').select('hotel_id, price_per_night').in('hotel_id', ids).eq('status', 'available')
    : { data: [] }

  const minPriceMap = (prices ?? []).reduce<Record<string, number>>((acc, r) => {
    if (!acc[r.hotel_id] || r.price_per_night < acc[r.hotel_id]) acc[r.hotel_id] = r.price_per_night
    return acc
  }, {})

  // Rank an exact city hit above a prefix hit above a mere substring, so a search
  // for "Lahore" leads with Lahore hotels rather than whatever is rated highest.
  const relevance = (h: { name: string; city: string; country: string }) => {
    if (!safeTerm) return 0
    const t = safeTerm.toLowerCase()
    const fields = [h.city ?? '', h.name ?? '', h.country ?? ''].map(v => v.toLowerCase())
    if (fields.some(f => f === t)) return 0
    if (fields.some(f => f.startsWith(t))) return 1
    return 2
  }

  const hotelList: Hotel[] = (hotels ?? [])
    .map(h => ({ ...h, min_price: minPriceMap[h.id] }))
    .sort(
      (a, b) =>
        relevance(a) - relevance(b) ||
        (a.cover_image ? 0 : 1) - (b.cover_image ? 0 : 1) ||
        (b.rating ?? 0) - (a.rating ?? 0)
    )

  // Fetch saved hotel IDs for the logged-in user
  const savedSet = new Set<string>()
  if (user && ids.length) {
    const { data: saved } = await authSupabase
      .from('saved_hotels')
      .select('hotel_id')
      .eq('user_id', user.id)
      .in('hotel_id', ids)
    ;(saved ?? []).forEach(s => savedSet.add(s.hotel_id))
  }

  const hasFilter = !!(city || check_in)

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
      <section className="relative z-10 bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800">
        {/* Decorative blobs — clipped by their own wrapper instead of the section */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Trusted by guests across Pakistan
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            Every trip deserves<br />
            <span className="text-amber-400">a great stay.</span>
          </h1>
          <p className="text-indigo-200 text-lg mb-10 max-w-lg">
            Browse verified hotels, pick your dates, and book in minutes — no sign-up needed to explore.
          </p>

          {/* Search form */}
          {/* key: remounts the bar whenever the URL params change, so "Clear ×"
              actually empties the fields instead of leaving stale client state. */}
          <HeroSearchBar
            key={`${city ?? ''}|${check_in ?? ''}|${check_out ?? ''}|${adults ?? ''}|${children ?? ''}`}
            defaultCity={city}
            defaultCheckIn={check_in}
            defaultCheckOut={check_out}
            defaultAdults={adults ? Number(adults) : 0}
            defaultChildren={children ? Number(children) : 0}
          />
        </div>
      </section>

      {/* ── Hotel grid ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {hasFilter
                ? city ? `Hotels in ${city}` : 'Search results'
                : 'Top-rated stays'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {check_in && check_out
                ? `${new Date(check_in).toLocaleDateString('en', { day: 'numeric', month: 'short' })} – ${new Date(check_out).toLocaleDateString('en', { day: 'numeric', month: 'short' })}`
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
            <p className="text-gray-400 text-sm mt-1">Try a different city or clear your search.</p>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-indigo-600 hover:underline">Browse all hotels</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hotelList.map(hotel => {
              const nights = check_in && check_out
                ? Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000)
                : null
              const amenities = (hotel.amenities ?? []).slice(0, 3)
              const initial = hotel.name.trim().charAt(0).toUpperCase()
              // Carry only the params the guest actually chose.
              const hp = new URLSearchParams()
              if (check_in) hp.set('check_in', check_in)
              if (check_out) hp.set('check_out', check_out)
              if (adults) hp.set('adults', adults)
              if (children) hp.set('children', children)
              const href = `/hotels/${hotel.id}${hp.toString() ? `?${hp.toString()}` : ''}`
              return (
                // Wrapper div — heart button is a sibling of Link so clicks never bubble into Link
                <div key={hotel.id} className="group relative flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <Link href={href} className="flex flex-col flex-1">
                    <div className="relative aspect-[4/3] bg-indigo-100 overflow-hidden flex-shrink-0">
                      {hotel.cover_image ? (
                        <Image
                          src={hotel.cover_image}
                          alt={hotel.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                          <span className="text-7xl font-black text-white/30 select-none">{initial}</span>
                        </div>
                      )}
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
                              <p className="text-xl font-extrabold text-gray-900 leading-none">
                                Rs {nights ? (hotel.min_price * nights).toLocaleString() : hotel.min_price.toLocaleString()}
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

        {!hasFilter && hotelList.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/?city="
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Browse all stays <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ── For hotel owners banner ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">For hotel owners</p>
            <h3 className="text-2xl font-extrabold text-gray-900">Got a property to list?</h3>
            <p className="text-gray-500 mt-2 max-w-sm">Set up your hotel on BookQayam and start receiving bookings from day one. Free, fast and simple.</p>
          </div>
          <Link
            href="/hotel-management"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            Get started <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
