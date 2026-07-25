'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  hotelName: string
  location: string
  rating?: number | null
  reviewCount?: number | null
}

export default function HotelImageGallery({ images, hotelName, location, rating, reviewCount }: Props) {
  const [active, setActive] = useState(0)

  if (!images.length) {
    return (
      <div className="relative h-72 sm:h-[420px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-8xl rounded-t-2xl">
        🏨
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h1 className="text-3xl font-bold text-white">{hotelName}</h1>
          <p className="mt-1 text-sm text-white/80">{location}</p>
        </div>
      </div>
    )
  }

  const prev = () => setActive(i => (i - 1 + images.length) % images.length)
  const next = () => setActive(i => (i + 1) % images.length)

  return (
    <div>
      {/* Main image */}
      <div className="relative h-72 sm:h-[420px] bg-gray-100 overflow-hidden rounded-t-2xl group">
        <Image
          src={images[active]}
          alt={`${hotelName} photo ${active + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Rating badge */}
        {rating && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-gray-900 shadow backdrop-blur">
            ★ {Number(rating).toFixed(1)}
            {reviewCount ? <span className="font-normal text-gray-500 ml-0.5">({reviewCount})</span> : null}
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white font-medium backdrop-blur">
            {active + 1} / {images.length}
          </div>
        )}

        {/* Prev / Next arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Hotel name overlay */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">{hotelName}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
            <span>📍</span> {location}
          </p>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50 border-t border-gray-100">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden transition-all ${
                i === active
                  ? 'ring-2 ring-indigo-500 ring-offset-1 opacity-100'
                  : 'opacity-60 hover:opacity-90'
              }`}
            >
              <Image src={src} alt={`thumb ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
