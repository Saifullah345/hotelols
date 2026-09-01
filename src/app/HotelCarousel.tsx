'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'
import SaveHotelButton from '@/components/SaveHotelButton'

export type CarouselHotel = {
  id: string
  name: string
  city: string
  country: string | null
  cover_image: string | null
  rating: number | null
  review_count: number | null
  /** Built on the server so the chosen dates and party size travel with the click. */
  href: string
  saved: boolean
}

export default function HotelCarousel({
  hotels,
  isLoggedIn,
  variant = 'feature',
  autoplay = false,
}: {
  hotels: CarouselHotel[]
  isLoggedIn: boolean
  /** 'feature' = big square cards. 'compact' = small ones, name only. */
  variant?: 'feature' | 'compact'
  /** Drifts the rail sideways forever, looping seamlessly. Pauses on hover. */
  autoplay?: boolean
}) {
  const compact = variant === 'compact'
  const trackRef = useRef<HTMLDivElement>(null)

  // Enough copies of the list that one copy is always narrower than the leftover
  // scroll room — otherwise the wrap point sits past the end and the rail stalls.
  const repeats = autoplay ? Math.max(3, Math.ceil(12 / Math.max(hotels.length, 1))) : 1
  const loop = Array.from({ length: repeats }, () => hotels).flat()

  // ── Manual mode: arrows appear only when there is somewhere to scroll ──────
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track || autoplay) return
    setAtStart(track.scrollLeft <= 4)
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4)
  }, [autoplay])

  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync, hotels.length])

  const scroll = (dir: 'prev' | 'next') => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild as HTMLElement | null
    const amount = card ? card.offsetWidth + 16 : 300
    track.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  // ── Autoplay: nudge scrollLeft every frame, snapping back by exactly one copy
  //    when it passes it. Since every copy is identical the jump is invisible. ──
  const paused = useRef(false)
  useEffect(() => {
    const track = trackRef.current
    if (!track || !autoplay) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let previous = performance.now()
    const SPEED = 0.035 // px per ms — a slow drift, not a slideshow

    const step = (now: number) => {
      const elapsed = now - previous
      previous = now
      if (!paused.current) {
        const copyWidth = track.scrollWidth / repeats
        track.scrollLeft += elapsed * SPEED
        if (track.scrollLeft >= copyWidth) track.scrollLeft -= copyWidth
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [autoplay, repeats, hotels.length])

  return (
    <div
      className="relative"
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
    >
      {!autoplay && !atStart && (
        <button
          onClick={() => scroll('prev')}
          aria-label="Previous stays"
          className="hidden lg:flex absolute left-2 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {!autoplay && !atEnd && (
        <button
          onClick={() => scroll('next')}
          aria-label="More stays"
          className="hidden lg:flex absolute right-2 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur hover:bg-white transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={trackRef}
        onScroll={sync}
        className={`flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          autoplay ? '' : 'scroll-smooth snap-x snap-mandatory'
        }`}
      >
        {loop.map((hotel, i) => (
          <div
            key={`${hotel.id}-${i}`}
            // Only the first pass through the list is real content; the copies
            // exist to make the loop seamless, so screen readers skip them.
            aria-hidden={i >= hotels.length}
            className={`group relative flex-none ${autoplay ? '' : 'snap-start'} ${
              autoplay
                ? compact ? 'w-[200px] sm:w-[230px]' : 'w-[280px] sm:w-[320px]'
                : compact
                  ? 'w-[45%] sm:w-[calc(33.333%-11px)] lg:w-[calc(16.666%-14px)]'
                  : 'w-[78%] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]'
            }`}
          >
            <Link
              href={hotel.href}
              tabIndex={i >= hotels.length ? -1 : undefined}
              className={`block relative overflow-hidden rounded-2xl bg-indigo-100 shadow-sm transition-all duration-300 hover:shadow-xl ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}
            >
              <Image
                src={hotel.cover_image || '/hotel-placeholder.svg'}
                alt={hotel.name}
                fill
                sizes={compact
                  ? '(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 17vw'
                  : '(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 25vw'}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              {/* Reaches high enough for the name to stay readable over a bright photo. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              {!compact && (
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-900 shadow backdrop-blur">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {hotel.rating ? Number(hotel.rating).toFixed(1) : 'New'}
                  {hotel.review_count ? (
                    <span className="ml-0.5 font-normal text-gray-400">({hotel.review_count})</span>
                  ) : null}
                </div>
              )}

              <div className={compact ? 'absolute inset-x-0 bottom-0 p-3' : 'absolute inset-x-0 bottom-0 p-4'}>
                <h3 className={`font-bold text-white leading-snug line-clamp-1 drop-shadow ${compact ? 'text-sm' : 'text-lg'}`}>
                  {hotel.name}
                </h3>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className={`flex min-w-0 items-center gap-1 font-medium text-white/85 drop-shadow ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    <MapPin className={compact ? 'h-3 w-3 flex-shrink-0' : 'h-3.5 w-3.5 flex-shrink-0'} />
                    <span className="truncate">
                      {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                    </span>
                  </p>
                  {!compact && (
                    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                      Book Now <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Sibling of the Link so a save never navigates to the hotel. */}
            {i < hotels.length && (
              <div className="absolute top-3 right-3 z-10">
                <SaveHotelButton
                  hotelId={hotel.id}
                  initialSaved={hotel.saved}
                  isLoggedIn={isLoggedIn}
                  variant="card"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
