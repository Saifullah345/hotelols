'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Building2, BedDouble, CalendarCheck, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    icon: Building2,
    title: 'Register your hotel',
    desc: 'Fill in your hotel details, upload photos, and go live in under 10 minutes.',
  },
  {
    icon: BedDouble,
    title: 'Add your rooms',
    desc: 'Create room types, set prices and availability. All rooms visible to guests instantly.',
  },
  {
    icon: CalendarCheck,
    title: 'Receive bookings',
    desc: 'Accept online bookings from guests or record walk-ins directly from the dashboard.',
  },
  {
    icon: TrendingUp,
    title: 'Manage & grow',
    desc: 'Track payments, manage staff, view reports, and scale your business with confidence.',
  },
]

export default function StepsCarousel() {
  const railRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // A native scroller does the work — the arrows only nudge it. That keeps
  // touch swiping, keyboard scrolling and the scrollbar all working for free.
  const sync = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const max = rail.scrollWidth - rail.clientWidth
    setAtStart(rail.scrollLeft <= 1)
    setAtEnd(rail.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    sync()
    const rail = railRef.current
    if (!rail) return
    const ro = new ResizeObserver(sync)
    ro.observe(rail)
    return () => ro.disconnect()
  }, [sync])

  const nudge = (direction: 1 | -1) => {
    const rail = railRef.current
    if (!rail) return
    const card = rail.firstElementChild as HTMLElement | null
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0
    const step = card ? card.getBoundingClientRect().width + gap : rail.clientWidth
    rail.scrollBy({ left: step * direction, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        onScroll={sync}
        className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
      >
        {STEPS.map(({ icon: Icon, title, desc }, i) => (
          <article
            key={title}
            className="w-[248px] flex-shrink-0 snap-start rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Icon className="h-6 w-6 text-primary-600" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-bold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
          </article>
        ))}
      </div>

      {/* Hidden once the rail fits, so they never sit there doing nothing. */}
      {!(atStart && atEnd) && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Previous step"
            className="absolute -left-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-opacity hover:text-gray-900 disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Next step"
            className="absolute -right-4 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-opacity hover:text-gray-900 disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  )
}
