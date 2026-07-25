'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin, Star, Wifi, Car, Coffee } from 'lucide-react'

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

interface Props {
  hotels: Hotel[]
  checkIn?: string
  checkOut?: string
  adults?: string
  children?: string
}

export default function HotelSlider({ hotels, checkIn, checkOut, adults, children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'prev' | 'next') => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const amount = card ? card.offsetWidth + 20 : 320
    track.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  const nights =
    checkIn && checkOut
      ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : null

  return (
    <div className="relative group/slider">
      {/* Prev arrow */}
      <button
        onClick={() => scroll('prev')}
        aria-label="Previous"
        className="absolute -left-5 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all opacity-0 group-hover/slider:opacity-100"
      >
        <ChevronLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Next arrow */}
      <button
        onClick={() => scroll('next')}
        aria-label="Next"
        className="absolute -right-5 top-[45%] -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all opacity-0 group-hover/slider:opacity-100"
      >
        <ChevronRight className="h-5 w-5 text-gray-700" />
      </button>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1"
      >
        {hotels.map(hotel => {
          const initial = hotel.name.trim().charAt(0).toUpperCase()
          const amenities = (hotel.amenities ?? []).slice(0, 3)
          const href = `/hotels/${hotel.id}${checkIn ? `?check_in=${checkIn}&check_out=${checkOut ?? ''}&adults=${adults ?? 2}&children=${children ?? 0}` : ''}`

          return (
            <Link
              key={hotel.id}
              href={href}
              className="group flex-none w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] snap-start flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image */}
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

                {hotel.rating ? (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {Number(hotel.rating).toFixed(1)}
                    {hotel.review_count ? (
                      <span className="font-normal text-gray-400 ml-0.5">({hotel.review_count})</span>
                    ) : null}
                  </div>
                ) : null}

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
                          Rs {nights
                            ? (hotel.min_price * nights).toLocaleString()
                            : hotel.min_price.toLocaleString()}
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
          )
        })}
      </div>
    </div>
  )
}
