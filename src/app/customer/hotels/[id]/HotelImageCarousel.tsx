'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt: string
  children?: React.ReactNode
}

export default function HotelImageCarousel({ images, alt, children }: Props) {
  const [index, setIndex] = useState(0)
  const hasMultiple = images.length > 1

  const prev = () => setIndex(i => (i - 1 + images.length) % images.length)
  const next = () => setIndex(i => (i + 1) % images.length)

  return (
    <div>
      <div className="relative h-72 overflow-hidden sm:h-80">
        {images.length > 0 ? (
          images.map((src, i) => (
            <div
              key={src + i}
              className={`absolute inset-0 transition-opacity duration-300 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <Image src={src} alt={alt} fill className="object-cover" unoptimized priority={i === 0} />
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-500 to-primary-800 text-7xl">🏨</div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {children}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === index ? 'ring-primary-600' : 'ring-transparent'}`}
            >
              <Image src={src} alt={alt} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
