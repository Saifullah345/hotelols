'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'

interface Props {
  images: string[]
  hotelName: string
  location: string
  rating?: number | null
  reviewCount?: number | null
  showHeader?: boolean
}

export default function HotelImageGallery({
  images, hotelName, location, rating, reviewCount, showHeader = true,
}: Props) {
  const [active, setActive] = useState(0)

  const prev = () => setActive(i => (i - 1 + images.length) % images.length)
  const next = () => setActive(i => (i + 1) % images.length)

  const header = !showHeader ? null : (
    <div className="flex flex-wrap items-start justify-between gap-3 px-1 pt-4 pb-2">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{hotelName}</h1>
        {location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-4 w-4 shrink-0 text-primary-600" /> {location}
          </p>
        )}
      </div>
      {rating ? (
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-gray-900">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {Number(rating).toFixed(1)}
          {reviewCount ? <span className="ml-0.5 font-normal text-gray-500">({reviewCount})</span> : null}
        </div>
      ) : null}
    </div>
  )

  if (!images.length) {
    return (
      <div>
        <div className="flex h-72 sm:h-96 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-8xl">
          🏨
        </div>
        {header}
      </div>
    )
  }

  return (
    <div>
      {/* ── Main image ── */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '16/9' }}>
        <Image
          src={images[active]}
          alt={`${hotelName} photo ${active + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          unoptimized
          priority
        />

        {/* Subtle bottom gradient so counter/arrows don't clash with bright skies */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Counter */}
        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {active + 1} / {images.length}
          </span>
        )}

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-lg backdrop-blur-sm transition hover:bg-white hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-lg backdrop-blur-sm transition hover:bg-white hover:scale-105"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {images.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                i === active
                  ? 'ring-2 ring-primary-600 ring-offset-2 opacity-100'
                  : 'opacity-60 hover:opacity-90'
              }`}
            >
              <Image src={src} alt={`${hotelName} thumbnail ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}

      {header}
    </div>
  )
}
