import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SaveHotelButton from '@/components/SaveHotelButton'
import { formatCurrency } from '@/lib/currency'
import { MapPin, Star, Wifi, Car, Coffee, ChevronRight, Heart } from 'lucide-react'

export const metadata = { title: 'Saved Hotels' }
export const dynamic = 'force-dynamic'

type SavedRow = {
  hotel: {
    id: string
    name: string
    city: string
    country: string | null
    address: string | null
    currency: string | null
    cover_image: string | null
    rating: number | null
    review_count: number | null
    amenities: string[] | null
    min_price: number | null
  } | null
}

export default async function SavedHotelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('saved_hotels')
    .select(`
      hotel:hotels (
        id, name, city, country, address, currency,
        cover_image, rating, review_count, amenities
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Supabase returns hotel as an array for joined rows; normalise to single object
  const hotels = (rows ?? [])
    .map((r: unknown) => {
      const row = r as { hotel: SavedRow['hotel'] | SavedRow['hotel'][] }
      return Array.isArray(row.hotel) ? row.hotel[0] : row.hotel
    })
    .filter(Boolean) as NonNullable<SavedRow['hotel']>[]

  // Get minimum room prices
  let priceMap: Record<string, number> = {}
  if (hotels.length > 0) {
    const hotelIds = hotels.map(h => h!.id)
    const { data: rooms } = await supabase
      .from('rooms')
      .select('hotel_id, price_per_night')
      .in('hotel_id', hotelIds)
      .eq('status', 'available')

    for (const r of (rooms ?? []) as { hotel_id: string; price_per_night: number }[]) {
      if (!priceMap[r.hotel_id] || r.price_per_night < priceMap[r.hotel_id]) {
        priceMap[r.hotel_id] = r.price_per_night
      }
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Hotels</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {hotels.length} saved propert{hotels.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Browse more hotels
        </Link>
      </div>

      {/* ── Empty state ── */}
      {hotels.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-red-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No saved hotels yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Browse hotels and tap the heart icon to save your favourites here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            Explore Hotels <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* ── Hotel grid ── */}
      {hotels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hotels.map(hotel => {
            if (!hotel) return null
            const amenities = (hotel.amenities ?? []).slice(0, 3)
            const initial   = hotel.name.trim().charAt(0).toUpperCase()
            const minPrice  = priceMap[hotel.id] ?? null

            return (
              <div
                key={hotel.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <Link href={`/hotels/${hotel.id}`} className="flex flex-col flex-1">

                  {/* Cover image */}
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

                    {/* Rating */}
                    {hotel.rating ? (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(hotel.rating).toFixed(1)}
                        {hotel.review_count ? (
                          <span className="font-normal text-gray-400 ml-0.5">({hotel.review_count})</span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Location */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4 gap-3">
                    <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-indigo-700 transition-colors line-clamp-1">
                      {hotel.name}
                    </h3>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {amenities.map(a => (
                          <span
                            key={a}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"
                          >
                            {a.toLowerCase().includes('wifi')      && <Wifi   className="h-3 w-3" />}
                            {a.toLowerCase().includes('park')      && <Car    className="h-3 w-3" />}
                            {a.toLowerCase().includes('breakfast') && <Coffee className="h-3 w-3" />}
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        {minPrice ? (
                          <>
                            <p className="text-[11px] text-gray-400 leading-none mb-0.5">from</p>
                            <p className="text-xl font-extrabold text-gray-900 leading-none">
                              {formatCurrency(minPrice, hotel.currency ?? 'PKR')}
                              <span className="text-sm font-normal text-gray-400"> /night</span>
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

                {/* Heart — outside Link so it never triggers navigation */}
                <div className="absolute top-3 right-3 z-10">
                  <SaveHotelButton
                    hotelId={hotel.id}
                    initialSaved={true}
                    isLoggedIn={true}
                    variant="card"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
