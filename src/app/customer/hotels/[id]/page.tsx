import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Star, Clock, Phone, Mail, BedDouble, ShieldCheck, ArrowLeft,
  Wifi, Waves, Car, Coffee, Dumbbell, Sparkles, Tv, Wind, PawPrint, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import BookRoomButton from './BookRoomButton'
import HotelImageCarousel from './HotelImageCarousel'
import HotelLocationMap from './HotelLocationMap'

function getAmenityIcon(name: string): LucideIcon {
  const key = name.toLowerCase()
  if (key.includes('wifi')) return Wifi
  if (key.includes('pool')) return Waves
  if (key.includes('park')) return Car
  if (key.includes('breakfast') || key.includes('coffee')) return Coffee
  if (key.includes('gym') || key.includes('fitness')) return Dumbbell
  if (key.includes('spa')) return Sparkles
  if (key.includes('air') || key.includes('ac')) return Wind
  if (key.includes('tv')) return Tv
  if (key.includes('pet')) return PawPrint
  return CheckCircle2
}

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
    .select('*, room_type:room_types(name, description)')
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

  const gallery = ((hotel.images as string[] | null) ?? []).filter(Boolean)
  const allImages = [hotel.cover_image, ...gallery].filter((src): src is string => Boolean(src))
  const uniqueImages = Array.from(new Set(allImages))
  const fromPrice = rooms?.length ? Math.min(...rooms.map(r => r.price_per_night)) : null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/customer/hotels" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to hotels
      </Link>

      {/* Hero */}
      <div className="card overflow-hidden">
        <HotelImageCarousel images={uniqueImages} alt={hotel.name}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm backdrop-blur">
            <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
            {hotel.rating.toFixed(1)}
            <span className="font-normal text-gray-500">({hotel.review_count})</span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-3xl font-bold text-white drop-shadow-sm sm:text-4xl">{hotel.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90">
              <MapPin className="h-4 w-4" />
              {hotel.address}, {hotel.city}, {hotel.country}
            </p>
          </div>
        </HotelImageCarousel>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 p-5 sm:grid-cols-4">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Check-in / out</p>
              <p className="text-sm font-medium text-gray-900">{hotel.check_in_time?.slice(0, 5)} – {hotel.check_out_time?.slice(0, 5)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="truncate text-sm font-medium text-gray-900">{hotel.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="truncate text-sm font-medium text-gray-900">{hotel.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium text-gray-900">Verified property</p>
            </div>
          </div>
        </div>

        {hotel.description && (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="text-sm leading-6 text-gray-600">{hotel.description}</p>
          </div>
        )}

        {(hotel.amenities as string[]).length > 0 && (
          <div className="border-t border-gray-100 p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {(hotel.amenities as string[]).map(a => {
                const Icon = getAmenityIcon(a)
                return (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                    <Icon className="h-3.5 w-3.5 text-primary-600" /> {a}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <HotelLocationMap
        latitude={hotel.latitude}
        longitude={hotel.longitude}
        name={hotel.name}
        address={`${hotel.address}, ${hotel.city}, ${hotel.country}`}
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        {/* Main column */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          {/* Rooms */}
          <div id="rooms">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Available Rooms</h2>
              <span className="text-sm text-gray-500">{rooms?.length ?? 0} room{rooms?.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-4">
              {rooms?.map(room => {
                const roomImage = (room.images as string[] | null ?? [])[0]
                return (
                <div key={room.id} className="card flex flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {roomImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={roomImage} alt={(room.room_type as { name?: string })?.name ?? 'Room photo'} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                        <BedDouble className="h-6 w-6 text-primary-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Room {room.room_number}{room.name ? ` (${room.name})` : ''} — {(room.room_type as { name?: string })?.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Floor {room.floor} · {room.capacity} guests max
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {((room.amenities as string[] | null) ?? []).slice(0, 3).map((a: string) => (
                          <span key={a} className="badge-gray text-xs">{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:text-right">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">${room.price_per_night}</p>
                      <p className="text-sm text-gray-500">per night</p>
                    </div>
                    <BookRoomButton roomId={room.id} hotelId={id} pricePerNight={room.price_per_night} />
                  </div>
                </div>
                )
              })}
              {!rooms?.length && (
                <div className="card p-8 text-center text-gray-500">No rooms available at this time</div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Guest Reviews</h2>
              {hotel.review_count > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
                  {hotel.rating.toFixed(1)} · {hotel.review_count} review{hotel.review_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {reviews && reviews.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map(review => (
                  <div key={review.id} className="card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-gray-900">{(review.user as { full_name?: string })?.full_name || 'Guest'}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-gold-500 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center text-gray-500">No reviews yet — be the first to stay and share your experience.</div>
            )}
          </div>
        </div>

        {/* Booking summary sidebar */}
        <div className="order-1 lg:order-2 lg:col-span-1">
          <div className="card space-y-4 p-5 lg:sticky lg:top-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Starting from</p>
              <p className="text-3xl font-bold text-gray-900">
                {fromPrice !== null ? `$${fromPrice}` : '—'}
                {fromPrice !== null && <span className="text-base font-normal text-gray-500"> / night</span>}
              </p>
            </div>
            <a href="#rooms" className="btn-primary w-full justify-center">View rooms</a>
            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Star className="h-4 w-4 fill-gold-500 text-gold-500" /> {hotel.rating.toFixed(1)} rating · {hotel.review_count} reviews</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {hotel.phone || 'Not provided'}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {hotel.email || 'Not provided'}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure booking & payments
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
