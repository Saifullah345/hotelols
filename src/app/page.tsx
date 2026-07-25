import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import HeroSearchBar from './HeroSearchBar'
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
  const supabase = await createAdminClient()

  let q = supabase
    .from('hotels')
    .select('id, name, city, country, cover_image, rating, amenities, review_count')
    .eq('status', 'active')
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(9)

  if (city) q = q.ilike('city', `%${city}%`)

  const { data: hotels } = await q

  const ids = (hotels ?? []).map(h => h.id)
  const { data: prices } = ids.length
    ? await supabase.from('rooms').select('hotel_id, price_per_night').in('hotel_id', ids).eq('status', 'available')
    : { data: [] }

  const minPriceMap = (prices ?? []).reduce<Record<string, number>>((acc, r) => {
    if (!acc[r.hotel_id] || r.price_per_night < acc[r.hotel_id]) acc[r.hotel_id] = r.price_per_night
    return acc
  }, {})

  const hotelList: Hotel[] = (hotels ?? []).map(h => ({ ...h, min_price: minPriceMap[h.id] }))
  const hasFilter = !!(city || check_in)

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-3xl" />

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
          <HeroSearchBar
            defaultCity={city}
            defaultCheckIn={check_in}
            defaultCheckOut={check_out}
            defaultAdults={adults ? Number(adults) : 2}
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
              {hotelList.length} propert{hotelList.length !== 1 ? 'ies' : 'y'}
              {check_in && check_out
                ? ` · ${new Date(check_in).toLocaleDateString('en', { day: 'numeric', month: 'short' })} – ${new Date(check_out).toLocaleDateString('en', { day: 'numeric', month: 'short' })}`
                : ''}
            </p>
          </div>
          {hasFilter && (
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Clear ×
            </Link>
          )}
        </div>

        {hotelList.length === 0 ? (
          <div className="py-24 text-center">
            <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No hotels found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different city or clear your search.</p>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-indigo-600 hover:underline">Browse all hotels</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotelList.map(hotel => {
              const nights = check_in && check_out
                ? Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000)
                : null
              return (
                <Link
                  key={hotel.id}
                  href={`/hotels/${hotel.id}${check_in ? `?check_in=${check_in}&check_out=${check_out ?? ''}&adults=${adults ?? 2}&children=${children ?? 0}` : ''}`}
                  className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg transition-all duration-200"
                >
                  {/* Image */}
                  <div className="relative h-52 bg-indigo-100 overflow-hidden flex-shrink-0">
                    {hotel.cover_image ? (
                      <Image
                        src={hotel.cover_image}
                        alt={hotel.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">🏨</div>
                    )}

                    {/* Rating pill */}
                    {hotel.rating && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(hotel.rating).toFixed(1)}
                        {hotel.review_count ? <span className="font-normal text-gray-400">({hotel.review_count})</span> : null}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-indigo-700 transition-colors">
                      {hotel.name}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                    </p>

                    {/* Amenity chips */}
                    {(hotel.amenities ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(hotel.amenities ?? []).slice(0, 3).map(a => (
                          <span key={a} className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            {a.toLowerCase().includes('wifi') && <Wifi className="h-3 w-3" />}
                            {a.toLowerCase().includes('park') && <Car className="h-3 w-3" />}
                            {a.toLowerCase().includes('breakfast') && <Coffee className="h-3 w-3" />}
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price + CTA */}
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-end justify-between mt-4">
                      <div>
                        {hotel.min_price ? (
                          <>
                            <p className="text-[11px] text-gray-400">
                              {nights ? `${nights} night${nights > 1 ? 's' : ''} from` : 'from'}
                            </p>
                            <p className="text-lg font-extrabold text-gray-900">
                              Rs {nights ? (hotel.min_price * nights).toLocaleString() : hotel.min_price.toLocaleString()}
                              {!nights && <span className="text-xs font-normal text-gray-400"> /night</span>}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Price on request</p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
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
