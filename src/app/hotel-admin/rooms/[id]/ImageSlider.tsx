'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, BedDouble } from 'lucide-react'

export function ImageSlider({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)

  if (!images.length) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3">
        <BedDouble className="h-14 w-14 text-gray-300" />
        <p className="text-sm text-gray-400">No photos added yet</p>
      </div>
    )
  }

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length)
  const next = () => setCurrent(i => (i + 1) % images.length)

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-[16/9] bg-gray-900 rounded-2xl overflow-hidden group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current]}
          alt={`Room photo ${current + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* Counter badge */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {current + 1} / {images.length}
        </div>

        {images.length > 1 && (
          <>
            {/* Prev / Next */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${
                    i === current
                      ? 'w-5 h-2 bg-white'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                i === current
                  ? 'border-blue-500 opacity-100 scale-105'
                  : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
