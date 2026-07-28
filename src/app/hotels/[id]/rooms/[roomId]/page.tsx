import type { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, BedDouble, Users, Building2, Clock, MapPin,
  Wifi, Wind, Tv, GlassWater, Shield, Waves, UtensilsCrossed,
  Coffee, Laptop, ShowerHead, Car, Dumbbell, Sparkles, CheckCircle2,
  ParkingCircle, Bath, Star, Home,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import RoomGallery from './RoomGallery'
import RoomBookingPanel, { type ExtraService } from './RoomBookingPanel'

// ── Icon helpers ──────────────────────────────────────────────────────
function getAmenityIcon(name: string): LucideIcon {
  const k = name.toLowerCase()
  if (k.includes('wifi') || k.includes('wi-fi') || k.includes('internet')) return Wifi
  if (k.includes('air') || k === 'ac' || k.includes('conditioning'))        return Wind
  if (k.includes('tv')  || k.includes('television'))                        return Tv
  if (k.includes('mini') || k.includes('bar') || k.includes('minibar'))     return GlassWater
  if (k.includes('safe'))                                                    return Shield
  if (k.includes('jacuzzi') || k.includes('hot tub'))                       return Waves
  if (k.includes('bathtub') || k.includes('tub'))                           return Bath
  if (k.includes('bathroom') || k.includes('shower'))                       return ShowerHead
  if (k.includes('kitchen'))                                                 return UtensilsCrossed
  if (k.includes('coffee') || k.includes('breakfast'))                      return Coffee
  if (k.includes('workspace') || k.includes('desk'))                        return Laptop
  if (k.includes('park'))                                                    return ParkingCircle
  if (k.includes('pool'))                                                    return Waves
  if (k.includes('gym') || k.includes('fitness'))                           return Dumbbell
  if (k.includes('spa'))                                                     return Sparkles
  if (k.includes('balcony') || k.includes('view') || k.includes('terrace')) return Home
  if (k.includes('car') || k.includes('transfer'))                          return Car
  return CheckCircle2
}

function to12h(time?: string | null) {
  if (!time) return '—'
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

// ── Metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>
}): Promise<Metadata> {
  const { id: hotelId, roomId } = await params
  const supabase = await createAdminClient()

  const [{ data: room }, { data: hotel }] = await Promise.all([
    supabase.from('rooms').select('name, room_number, room_type:room_types(name)').eq('id', roomId).single(),
    supabase.from('hotels').select('name').eq('id', hotelId).single(),
  ])

  const type  = (room?.room_type as { name?: string } | null)?.name ?? ''
  const rName = room?.name ?? `Room ${room?.room_number}`
  const title = hotel?.name ? `${rName}${type ? ` (${type})` : ''} — ${hotel.name}` : rName

  return {
    title,
    description: `Book ${rName} at ${hotel?.name ?? 'this hotel'}. View all photos, amenities, and available add-on services.`,
  }
}

// ── Page ──────────────────────────────────────────────────────────────
export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>
}) {
  const { id: hotelId, roomId } = await params

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  const supabase = await createAdminClient()

  const [{ data: room }, { data: hotel }] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(name, description, amenities)')
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .single(),
    supabase
      .from('hotels')
      .select('id, name, extra_services, check_in_time, check_out_time, currency, city, country, rating, review_count, status')
      .eq('id', hotelId)
      .single(),
  ])

  if (!room || !hotel || hotel.status !== 'active') notFound()

  const images        = (room.images        as string[] | null) ?? []
  const roomAmenities = (room.amenities     as string[] | null) ?? []
  const roomType      = room.room_type as { name?: string; description?: string; amenities?: string[] } | null
  const typeAmenities = (roomType?.amenities as string[] | null) ?? []
  // Merge room + type amenities; deduplicate case-insensitively
  const seen     = new Set<string>()
  const allAmenities = [...roomAmenities, ...typeAmenities].filter(a => {
    const k = a.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true
  })
  const extraServices = (hotel.extra_services as ExtraService[] | null) ?? []
  const location      = [hotel.city, hotel.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Back */}
        <Link
          href={`/hotels/${hotelId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {hotel.name}
        </Link>

        {/* Gallery */}
        <RoomGallery images={images} roomName={room.name ?? `Room ${room.room_number}`} />

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">

          {/* ── Left column ──────────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2 order-2 lg:order-1">

            {/* Room title card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {roomType?.name && (
                <span className="inline-block mb-3 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
                  {roomType.name}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {room.name ?? `Room ${room.room_number}`}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                  Floor {room.floor}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-400" />
                  {room.max_adults} adult{room.max_adults !== 1 ? 's' : ''}
                  {room.max_children > 0 ? ` · ${room.max_children} child${room.max_children !== 1 ? 'ren' : ''}` : ''}
                </span>
                {Number(hotel.rating) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {Number(hotel.rating).toFixed(1)}
                    {hotel.review_count ? <span className="text-gray-400">({hotel.review_count})</span> : null}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    {location}
                  </span>
                )}
              </div>

              {/* Mobile price (hidden lg) */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline gap-2 lg:hidden">
                <p className="text-2xl font-bold text-gray-900">Rs {room.price_per_night.toLocaleString()}</p>
                <p className="text-sm text-gray-500">/ night</p>
              </div>
            </div>

            {/* Description */}
            {roomType?.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">About this room</h2>
                <p className="text-sm text-gray-600 leading-6">{roomType.description}</p>
              </div>
            )}

            {/* Amenities */}
            {allAmenities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">What&apos;s included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allAmenities.map(a => {
                    const Icon = getAmenityIcon(a)
                    return (
                      <div key={a} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">{a}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto shrink-0" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Extra services info (mobile) */}
            {extraServices.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:hidden">
                <h2 className="text-base font-bold text-gray-900 mb-4">Available Add-On Services</h2>
                <div className="space-y-3">
                  {extraServices.map(s => (
                    <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">Rs {s.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          {s.per === 'flat' ? 'per stay' : s.per === 'per_night' ? 'per night' : 'per person'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Select add-ons in the booking panel above.</p>
              </div>
            )}

            {/* Room details grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Room Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Room Number</p>
                  <p className="font-semibold text-gray-900">{room.room_number}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Floor</p>
                  <p className="font-semibold text-gray-900">{room.floor}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Max Adults</p>
                  <p className="font-semibold text-gray-900">{room.max_adults}</p>
                </div>
                {room.max_children > 0 && (
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Max Children</p>
                    <p className="font-semibold text-gray-900">{room.max_children}</p>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Room Type</p>
                  <p className="font-semibold text-gray-900">{roomType?.name ?? '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Price / Night</p>
                  <p className="font-semibold text-indigo-700">Rs {room.price_per_night.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Hotel Policies</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Check-in from</p>
                    <p className="font-semibold text-gray-900">{to12h(hotel.check_in_time as string | null)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Check-out by</p>
                    <p className="font-semibold text-gray-900">{to12h(hotel.check_out_time as string | null)}</p>
                  </div>
                </div>
                {location && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Location</p>
                      <p className="font-semibold text-gray-900">{location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <BedDouble className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Capacity</p>
                    <p className="font-semibold text-gray-900">{room.max_adults + room.max_children} guest{room.max_adults + room.max_children !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column — Booking panel ─────────────────────────── */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <RoomBookingPanel
                roomId={roomId}
                hotelId={hotelId}
                pricePerNight={room.price_per_night}
                maxAdults={room.max_adults}
                maxChildren={room.max_children}
                extraServices={extraServices}
                isLoggedIn={!!user}
              />
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
