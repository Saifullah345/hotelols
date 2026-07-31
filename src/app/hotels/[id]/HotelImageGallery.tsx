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
  /** Off when the page shows the name and location in its own sticky card. */
  showHeader?: boolean
}

export default function HotelImageGallery({
  images, hotelName, location, rating, reviewCount, showHeader = true,
}: Props) {
  const [active, setActive] = useState(0)

  // Name, location and rating live under the photo rather than on top of it —
  // an overlay + dark gradient is what was washing the cover image out.
  const header = !showHeader ? null : (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
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
        <div className="flex h-64 sm:h-80 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-8xl">
          🏨
        </div>
        {header}
      </div>
    )
  }

  const prev = () => setActive(i => (i - 1 + images.length) % images.length)
  const next = () => setActive(i => (i + 1) % images.length)

  return (
    <div>
      {/* Pagination strip — above the photo, so nothing covers the image */}
      {images.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50 p-3">
          <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
            {active + 1} / {images.length}
          </span>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all ${
                i === active
                  ? 'opacity-100 ring-2 ring-indigo-500 ring-offset-1'
                  : 'opacity-60 hover:opacity-90'
              }`}
            >
              <Image src={src} alt={`${hotelName} thumbnail ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}

      {/* Main image — shown whole, nothing layered over it */}
      <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-gray-100">
        <Image
          src={images[active]}
          alt={`${hotelName} photo ${active + 1}`}
          fill
          className="object-contain"
          unoptimized
          priority
        />

        {/* Prev / Next — kept off the photo itself, on the letterbox edges */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {header}
    </div>
  )
}
