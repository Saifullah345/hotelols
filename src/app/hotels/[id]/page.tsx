export const revalidate = 30

import type { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Star, Clock, Phone, Mail, ShieldCheck, ArrowLeft, MapPin,
  Wifi, Waves, Car, Coffee, Dumbbell, Sparkles, Tv, Wind, PawPrint, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import HotelImageGallery from './HotelImageGallery'
import RoomsSection from './RoomsSection'
import SaveHotelButton from '@/components/SaveHotelButton'
import JsonLd from '@/components/seo/JsonLd'
import { pageMetadata, absoluteUrl, SITE_URL, SITE_NAME } from '@/lib/seo'
import { formatCurrency } from '@/lib/currency'
import { hasValidRange, nightsBetween, getBookedRoomIds } from '@/lib/search'
import { getPlanFeatures } from '@/lib/plan-features'

/** Trims DB copy to a clean meta description without cutting a word in half. */
function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/[\s,;:.-]+\S*$/, '')}…`
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('name, description, address, city, country, cover_image, rating, review_count')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!hotel) {
    return pageMetadata({
      title: 'Hotel Not Found — Browse Other Verified Stays',
      description: 'This hotel is no longer listed on BookQayam. Browse other verified hotels and book your next stay in minutes.',
      path: `/hotels/${id}`,
      noIndex: true,
    })
  }

  const place = [hotel.city, hotel.country].filter(Boolean).join(', ')
  const title = truncate(place ? `${hotel.name}, ${place} — Book Rooms & Rates` : `${hotel.name} — Book Rooms & Rates`, 60)

  const description = hotel.description
    ? truncate(hotel.description)
    : truncate(
        `Book ${hotel.name}${place ? ` in ${place}` : ''} on BookQayam. See live room rates, photos, amenities` +
          `${hotel.review_count ? ` and ${hotel.review_count} guest reviews` : ''}, then reserve in minutes.`
      )

  return pageMetadata({
    title,
    description,
    path: `/hotels/${id}`,
    images: hotel.cover_image ? [hotel.cover_image] : undefined,
  })
}

function to12h(time?: string | null) {
  if (!time) return '—'
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

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

export default async function PublicHotelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ check_in?: string; check_out?: string; adults?: string; children?: string }>
}) {
  const { id } = await params
  // Dates and party size travel from the landing-page search so the room list
  // shows what's actually bookable for that stay, not everything the hotel owns.
  const { check_in, check_out, adults: adultsParam, children: childrenParam } = await searchParams
  const datesApplied = hasValidRange(check_in, check_out)
  const nights = datesApplied ? nightsBetween(check_in!, check_out!) : 0
  const adults = Math.max(0, Number(adultsParam) || 0)
  const childrenCount = Math.max(0, Number(childrenParam) || 0)
  const guests = adults + childrenCount

  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  // Non-customer accounts have their own dashboards — redirect them away.
  if (user) {
    const { data: profile } = await authSupabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'hotel_admin') redirect('/hotel-admin/dashboard')
    if (profile?.role === 'super_admin') redirect('/super-admin/dashboard')
    if (profile?.role === 'staff') redirect('/staff/dashboard')
  }

  const supabase = await createAdminClient()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, plan:plans(name, feature_listing, feature_housekeeping, feature_reviews, feature_online_booking, feature_advanced_reports, feature_api_access, feature_multi_property)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!hotel) notFound()

  const { onlineBooking } = getPlanFeatures((hotel.plan ?? null) as import('@/lib/plan-features').PlanDbData | null)

  const [{ data: allRooms }, { data: reviews }] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(name, description)')
      .eq('hotel_id', id)
      .eq('status', 'available')
      .order('sort_order', { ascending: true })
      .order('price_per_night'),
    supabase
      .from('reviews')
      .select('*, user:profiles(full_name)')
      .eq('hotel_id', id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const currency = (hotel.currency as string | null) ?? 'PKR'

  // Drop rooms already taken for the requested nights — showing them would only
  // fail later, when the booking trigger rejects the overlap.
  const bookedRoomIds = datesApplied
    ? await getBookedRoomIds(supabase, [id], check_in!, check_out!)
    : new Set<string>()
  const rooms = (allRooms ?? []).filter(r => !bookedRoomIds.has(r.id))
  const unavailableCount = (allRooms?.length ?? 0) - rooms.length

  const gallery: string[] = ((hotel.images as string[] | null) ?? []).filter(Boolean)
  const allImages = [hotel.cover_image, ...gallery].filter((s): s is string => Boolean(s))
  const uniqueImages = Array.from(new Set(allImages))
  const fromPrice = rooms.length ? Math.min(...rooms.map(r => r.price_per_night)) : null

  // Check if user has saved this hotel
  let isSaved = false
  if (user) {
    const { data: savedRow } = await authSupabase
      .from('saved_hotels')
      .select('id')
      .eq('user_id', user.id)
      .eq('hotel_id', id)
      .single()
    isSaved = !!savedRow
  }

  // ── Structured data ─────────────────────────────────────────────
  const hotelUrl = absoluteUrl(`/hotels/${id}`)
  const hotelSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${hotelUrl}#hotel`,
    name: hotel.name,
    url: hotelUrl,
    ...(hotel.description ? { description: hotel.description } : {}),
    ...(uniqueImages.length ? { image: uniqueImages } : {}),
    ...(hotel.phone ? { telephone: hotel.phone } : {}),
    ...(hotel.email ? { email: hotel.email } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(hotel.address ? { streetAddress: hotel.address } : {}),
      ...(hotel.city ? { addressLocality: hotel.city } : {}),
      ...(hotel.country ? { addressCountry: hotel.country } : {}),
    },
    ...(hotel.latitude && hotel.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: hotel.latitude, longitude: hotel.longitude } }
      : {}),
    ...((hotel.amenities as string[] | null)?.length
      ? {
          amenityFeature: (hotel.amenities as string[]).map(a => ({
            '@type': 'LocationFeatureSpecification',
            name: a,
            value: true,
          })),
        }
      : {}),
    ...(hotel.check_in_time ? { checkinTime: hotel.check_in_time } : {}),
    ...(hotel.check_out_time ? { checkoutTime: hotel.check_out_time } : {}),
    // Only emit a rating when real reviews back it — an invented one is a structured-data violation.
    ...(hotel.review_count > 0 && hotel.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(hotel.rating),
            reviewCount: hotel.review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(fromPrice
      ? {
          priceRange: `From ${currency} ${fromPrice}`,
          makesOffer: {
            '@type': 'Offer',
            priceCurrency: currency,
            price: fromPrice,
            availability: 'https://schema.org/InStock',
            url: hotelUrl,
          },
        }
      : {}),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      ...(hotel.city
        ? [{ '@type': 'ListItem', position: 2, name: `Hotels in ${hotel.city}`, item: absoluteUrl(`/search?city=${encodeURIComponent(hotel.city)}`) }]
        : []),
      { '@type': 'ListItem', position: hotel.city ? 3 : 2, name: hotel.name, item: hotelUrl },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={[hotelSchema, breadcrumbSchema]} />
      <PublicNavbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to hotels
        </Link>

        {/* Gallery — scrolls away; the identity card below stays. */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <HotelImageGallery
            images={uniqueImages}
            hotelName={hotel.name}
            location={[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ')}
            rating={hotel.rating}
            reviewCount={hotel.review_count}
            showHeader={false}
          />
        </div>

        {/* Hotel information — sticks under the navbar for the whole room list.
            The grey band spans the container padding so rooms scrolling beneath
            it stay hidden instead of peeking around the card's corners. */}
        <div className="sticky top-16 z-30 -mx-4 bg-gray-50 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{hotel.name}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                <span className="truncate">{[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ')}</span>
                {Number(hotel.rating) > 0 && (
                  <span className="ml-1 flex shrink-0 items-center gap-1 font-semibold text-gray-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {Number(hotel.rating).toFixed(1)}
                    {hotel.review_count ? <span className="font-normal text-gray-400">({hotel.review_count})</span> : null}
                  </span>
                )}
              </p>
            </div>

            {/* Hidden on the narrowest screens so the sticky bar stays shallow */}
            <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 sm:flex">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary-600" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Check-in / out</p>
                  <p className="text-xs font-medium text-gray-900">
                    {to12h(hotel.check_in_time)} – {to12h(hotel.check_out_time)}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <Phone className="h-4 w-4 shrink-0 text-primary-600" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Phone</p>
                  <p className="truncate text-xs font-medium text-gray-900">{hotel.phone || '—'}</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <Mail className="h-4 w-4 shrink-0 text-primary-600" />
                <div className="min-w-0 max-w-[180px]">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Email</p>
                  <p className="truncate text-xs font-medium text-gray-900">{hotel.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Verified
              </div>
            </div>
          </div>
        </div>

        {/* Description + amenities */}
        {(hotel.description || (hotel.amenities as string[] | null)?.length) ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {hotel.description && (
              <div className="px-5 py-4">
                <p className="text-sm leading-6 text-gray-600">{hotel.description}</p>
              </div>
            )}

            {(hotel.amenities as string[] | null)?.length ? (
              <div className={`p-5 ${hotel.description ? 'border-t border-gray-100' : ''}`}>
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
            ) : null}
          </div>
        ) : null}

        {/* No `items-start`: it shrinks each column to its own content, which
            leaves the sticky sidebar no room to travel and it scrolls away with
            the first room. Stretched, it stays put for the whole room list. */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
            {/* Rooms */}
            {/* scroll-mt clears the navbar + sticky information bar when the
                page is opened on the #rooms anchor. */}
            <div id="rooms" className="scroll-mt-36">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-gray-900">Available Rooms</h2>
                {onlineBooking && (
                  <span className="text-sm text-gray-500">{rooms.length} room{rooms.length === 1 ? '' : 's'}</span>
                )}
              </div>

              {onlineBooking ? (
                <>
                  {datesApplied && (
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-2.5 text-sm text-primary-900">
                      <Clock className="h-4 w-4 flex-shrink-0 text-primary-600" />
                      <span className="font-medium">
                        {new Date(check_in!).toLocaleDateString('en', { day: 'numeric', month: 'short' })} –{' '}
                        {new Date(check_out!).toLocaleDateString('en', { day: 'numeric', month: 'short' })} · {nights} night{nights === 1 ? '' : 's'}
                        {guests > 0 ? ` · ${guests} guest${guests === 1 ? '' : 's'}` : ''}
                      </span>
                      {unavailableCount > 0 && (
                        <span className="text-primary-700/70">
                          ({unavailableCount} room{unavailableCount === 1 ? '' : 's'} already booked for these dates)
                        </span>
                      )}
                    </div>
                  )}
                  <RoomsSection
                    rooms={rooms}
                    hotelId={id}
                    isLoggedIn={!!user}
                    currency={currency}
                    defaultCheckIn={datesApplied ? check_in : undefined}
                    defaultCheckOut={datesApplied ? check_out : undefined}
                    defaultAdults={adults || undefined}
                    emptyMessage={
                      datesApplied
                        ? 'No rooms free for those dates — try a different range.'
                        : undefined
                    }
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                  <p className="text-base font-medium text-gray-700">Online booking is not available for this property.</p>
                  <p className="mt-1 text-sm text-gray-500">Please contact the hotel directly to make a reservation.</p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {hotel.phone && (
                      <a
                        href={`tel:${hotel.phone}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                      >
                        <Phone className="h-4 w-4" /> {hotel.phone}
                      </a>
                    )}
                    {hotel.email && (
                      <a
                        href={`mailto:${hotel.email}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        <Mail className="h-4 w-4" /> {hotel.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews */}
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-gray-900">Guest Reviews</h2>
                {(hotel.review_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {Number(hotel.rating).toFixed(1)} · {hotel.review_count} review{hotel.review_count === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {reviews && reviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-gray-900">{(review.user as { full_name?: string })?.full_name || 'Guest'}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
                  No reviews yet — be the first to stay and share your experience.
                </div>
              )}
            </div>
          </div>

          {/* Sticky sidebar */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            {/* Sits below the sticky information bar rather than under it. */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 lg:sticky lg:top-36">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Starting from</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {fromPrice !== null ? (
                      <>{formatCurrency(fromPrice, currency)}<span className="text-base font-normal text-gray-500"> / night</span></>
                    ) : '—'}
                  </p>
                </div>
                <SaveHotelButton
                  hotelId={id}
                  initialSaved={isSaved}
                  isLoggedIn={!!user}
                  variant="detail"
                />
              </div>
{!user && (
                <a
                  href={`/login?next=/hotels/${id}`}
                  className="w-full block text-center btn-secondary text-sm"
                >
                  Sign in to book
                </a>
              )}
              <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                {!!hotel.rating && (
                  <p className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {Number(hotel.rating).toFixed(1)} rating · {hotel.review_count ?? 0} reviews
                  </p>
                )}
                {hotel.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400 flex-shrink-0" /> {hotel.phone}</p>}
                {hotel.email && <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 text-gray-400 flex-shrink-0" /> {hotel.email}</p>}
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" /> Secure booking &amp; payments
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
