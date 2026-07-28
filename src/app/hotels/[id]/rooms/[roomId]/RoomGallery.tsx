'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, BedDouble, Expand } from 'lucide-react'

interface Props {
  images: string[]
  roomName: string
}

export default function RoomGallery({ images, roomName }: Props) {
  const [active, setActive]   = useState(0)
  const [lightbox, setLightbox] = useState(false)

  if (!images.length) {
    return (
      <div className="flex h-64 sm:h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-50 border border-indigo-100">
        <div className="text-center">
          <BedDouble className="h-14 w-14 text-indigo-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No photos available for this room</p>
        </div>
      </div>
    )
  }

  const prev = () => setActive(i => (i - 1 + images.length) % images.length)
  const next = () => setActive(i => (i + 1) % images.length)

  return (
    <>
      <div className="rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
        {/* Main image */}
        <div className="relative h-64 sm:h-[420px] group cursor-pointer" onClick={() => setLightbox(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={`${roomName} — photo ${active + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white font-medium backdrop-blur">
              {active + 1} / {images.length}
            </div>
          )}

          {/* Expand hint */}
          <div className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
            <Expand className="h-4 w-4" />
          </div>

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
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
                    : 'opacity-55 hover:opacity-85'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light leading-none">×</button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={`${roomName} photo ${active + 1}`}
            className="max-h-[85vh] max-w-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {active + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}
