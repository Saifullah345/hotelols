import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MapPin, Star, Clock, Phone, Mail, BedDouble } from 'lucide-react'
import Image from 'next/image'
import BookRoomButton from './BookRoomButton'

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, plan:plans(name)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!hotel) notFound()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, room_type:room_types(name, description, capacity, amenities)')
    .eq('hotel_id', id)
    .eq('status', 'available')
    .order('price_per_night')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, user:profiles(full_name)')
    .eq('hotel_id', id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hotel Header */}
      <div className="card overflow-hidden">
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-300">
          {hotel.cover_image ? (
            <Image src={hotel.cover_image} alt={hotel.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl">🏨</span>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">{hotel.name}</h1>
            <div className="flex items-center gap-1 text-gold-600">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-lg font-bold">{hotel.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({hotel.review_count} reviews)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{hotel.address}, {hotel.city}, {hotel.country}</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{hotel.phone}</span>
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{hotel.email}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Check-in: {hotel.check_in_time} | Check-out: {hotel.check_out_time}</span>
          </div>

          {hotel.description && <p className="text-gray-600 text-sm mb-4">{hotel.description}</p>}

          <div className="flex flex-wrap gap-2">
            {(hotel.amenities as string[]).map((a: string) => (
              <span key={a} className="badge-blue">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Available Rooms */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Rooms</h2>
        <div className="space-y-4">
          {rooms?.map(room => (
            <div key={room.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                  <BedDouble className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Room {room.room_number} — {(room.room_type as { name?: string })?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Floor {room.floor} · {(room.room_type as { capacity?: number })?.capacity} guests max
                  </p>
                  <div className="flex gap-1 mt-1">
                    {((room.room_type as { amenities?: string[] })?.amenities ?? []).slice(0, 3).map((a: string) => (
                      <span key={a} className="badge-gray text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">${room.price_per_night}</p>
                <p className="text-sm text-gray-500">per night</p>
                <BookRoomButton roomId={room.id} hotelId={id} pricePerNight={room.price_per_night} />
              </div>
            </div>
          ))}
          {!rooms?.length && (
            <div className="card p-8 text-center text-gray-500">No rooms available at this time</div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Guest Reviews</h2>
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{(review.user as { full_name?: string })?.full_name}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-gold-500 fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
