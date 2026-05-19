import { createClient } from '@/lib/supabase/server'
import { MapPin, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Search Hotels' }

export default async function CustomerHotelsPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; q?: string }>
}) {
  const { city, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('hotels')
    .select('*, plan:plans(name)')
    .eq('status', 'active')
    .order('rating', { ascending: false })

  if (city) query = query.ilike('city', `%${city}%`)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: hotels } = await query

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Find Your Perfect Stay</h2>
        <p className="text-gray-500 text-sm mt-1">{hotels?.length ?? 0} hotels available</p>
      </div>

      {/* Search */}
      <form className="flex gap-3" method="get">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search hotels..." />
        <input name="city" defaultValue={city} className="input max-w-48" placeholder="City" />
        <button type="submit" className="btn-primary px-6">Search</button>
        {(q || city) && (
          <Link href="/customer/hotels" className="btn-secondary">Clear</Link>
        )}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels?.map(hotel => (
          <Link key={hotel.id} href={`/customer/hotels/${hotel.id}`}
            className="card overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
              {hotel.cover_image ? (
                <Image src={hotel.cover_image} alt={hotel.name} fill className="object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🏨</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{hotel.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gold-600">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{hotel.rating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                <MapPin className="h-3 w-3" />
                {hotel.city}, {hotel.country}
              </p>
              {hotel.amenities?.slice(0, 3).map((a: string) => (
                <span key={a} className="badge-gray text-xs mr-1">{a}</span>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">Check-in: {hotel.check_in_time}</span>
                <span className="text-primary-600 text-sm font-medium">View Rooms →</span>
              </div>
            </div>
          </Link>
        ))}
        {!hotels?.length && (
          <div className="col-span-3 text-center py-16 text-gray-500">
            <p className="text-lg">No hotels found</p>
            <p className="text-sm mt-1">Try a different search</p>
          </div>
        )}
      </div>
    </div>
  )
}
