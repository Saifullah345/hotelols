'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Star, Quote, BadgeCheck } from 'lucide-react'

/**
 * PLACEHOLDER CONTENT — these are not real guests and not real reviews.
 * They exist so the section can be designed and laid out before there are
 * enough real stays to quote. Replace this array with rows from the `reviews`
 * table (name, city, rating, body, avatar) before launch; leaving invented
 * quotes on a live booking site tells guests something that is not true.
 */
const REVIEWS = [
  {
    name: 'Ayesha Khan',
    city: 'Lahore',
    rating: 5,
    avatar: '/avatars/guest-2.svg',
    verified: true,
    body: 'The hotel confirmed the booking within minutes and answered every question before we travelled. We reached Murree close to midnight and the room was still ready for us.',
  },
  {
    name: 'Bilal Ahmed',
    city: 'Karachi',
    rating: 5,
    avatar: '/avatars/guest-1.svg',
    verified: true,
    body: 'I asked for an early check-in and had a reply the same hour. Everything was arranged before I landed, so there was no waiting at the desk.',
  },
  {
    name: 'Fatima Noor',
    city: 'Islamabad',
    rating: 4,
    avatar: '/avatars/guest-4.svg',
    verified: true,
    body: 'Staff replied quickly and the room matched the photos exactly. Breakfast started a little later than listed, but they sent it up as soon as I asked.',
  },
  {
    name: 'Usman Tariq',
    city: 'Peshawar',
    rating: 5,
    avatar: '/avatars/guest-3.svg',
    verified: false,
    body: 'I had to move my dates two days before the trip. The hotel responded on time and shifted the booking without any argument.',
  },
  {
    name: 'Hina Raza',
    city: 'Multan',
    rating: 5,
    avatar: '/avatars/guest-5.svg',
    verified: true,
    body: 'Two rooms for the family, both clean and exactly as described. The manager even called a day early to confirm what time we would arrive.',
  },
  {
    name: 'Zeeshan Malik',
    city: 'Faisalabad',
    rating: 4,
    avatar: '/avatars/guest-6.svg',
    verified: false,
    body: 'Good service and honest photos. Reception picked up on the first ring every time I called, before and during the stay.',
  },
]

// Backdrop for the featured panel. It is mounted once and never moves — only
// the quote laid over it swaps as the carousel advances. Swap this for your own
// shot by dropping the file in public/ and pointing at it ('/reviews.jpg').
// images.unsplash.com is already allowed in next.config.ts remotePatterns.
//
// Cropped portrait (800×1000) because the panel is taller than it is wide: a
// landscape source object-covers down to a thin band of sky and loses the
// peaks. q=80 over the default 70 keeps the snow from banding under the scrim.
//
// A daylit shot, deliberately: dusk and night frames go dark under the veil and
// stop looking like a place anyone stayed. If you swap it, keep it high-key and
// keep people out of it — a figure behind the quote reads as the guest.
const FEATURE_IMAGE = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&crop=entropy&w=800&h=1000&q=80'

// How long each review holds the featured panel before the carousel steps on.
const HOLD_MS = 4000

function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${size} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function GuestReviews() {
  const trackRef = useRef<HTMLDivElement>(null)
  // The track holds two copies of REVIEWS. Stepping past the first copy lands on
  // a pixel-identical frame, so dropping the transition there and resetting the
  // index back by one copy is invisible — that is what makes the loop infinite.
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState(0)          // px travelled per review (card + gap)
  const [sliding, setSliding] = useState(true) // false only during the silent reset
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  // Card width is fluid (1 → 4 cards across the breakpoints), so measure the
  // rendered card rather than hard-coding a step per breakpoint.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const card = track.firstElementChild as HTMLElement | null
      if (!card) return
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      setStep(card.getBoundingClientRect().width + gap)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (paused || reduced || step === 0) return
    // Hold at the end of the first copy if the reset has not landed yet — a
    // background tab can withhold transitionendand stepping past the second
    // copy would slide the track off into empty space.
    const id = setInterval(() => setIndex(i => (i >= REVIEWS.length ? i : i + 1)), HOLD_MS)
    return () => clearInterval(id)
  }, [paused, reduced, step])

  // Re-arm the transition on the frame after the reset, so the jump back is
  // painted untransitioned but the next step still animates.
  useEffect(() => {
    if (sliding) return
    const raf = requestAnimationFrame(() => setSliding(true))
    return () => cancelAnimationFrame(raf)
  }, [sliding])

  // Floored modulo: a stray reset can briefly drive the index negativeand a
  // plain % would hand back a negative slot and blow up on the first read.
  const featured = REVIEWS[((index % REVIEWS.length) + REVIEWS.length) % REVIEWS.length]

  return (
    <section
      className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-7">
        <h2 className="text-2xl font-extrabold text-gray-900">What guests say</h2>
        <p className="text-sm text-gray-400 mt-1">Feedback from guests after their stay</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Featured panel. The photo is fixed in place; only the quote over it
            changes, following whichever review the carousel has stepped to. */}
        <figure className="relative isolate flex min-h-[360px] flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="absolute inset-0 -z-10">
            <Image
              src={FEATURE_IMAGE}
              alt=""
              fill
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-cover object-center"
            />
            <div className="review-photo-scrim absolute inset-0" />
          </div>

          <div key={featured.name} className="animate-review-swap max-w-[74%]">
            <Stars rating={featured.rating} size="h-5 w-5" />
            <blockquote className="mt-4 text-[15px] font-medium leading-relaxed text-gray-900">
              &ldquo;{featured.body}&rdquo;
            </blockquote>
          </div>

          <figcaption key={`${featured.name}-meta`} className="animate-review-swap mt-6 flex max-w-[74%] items-center gap-3">
            <Image
              src={featured.avatar}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 flex-shrink-0 rounded-full ring-2 ring-white"
              unoptimized
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{featured.name}</p>
              <p className="truncate text-xs text-gray-700">{featured.city}, Pakistan</p>
              {/* {featured.verified && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-800">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified Stay
                </p>
              )} */}
            </div>
          </figcaption>
        </figure>

        {/* Infinite carousel. Visitors who ask for reduced motion get a plain
            swipeable row instead of the auto-advancing one. */}
        <div className={reduced ? 'overflow-x-auto scrollbar-hide' : 'overflow-hidden'}>
          <div
            ref={trackRef}
            className={`flex gap-5 ${sliding && !reduced ? 'transition-transform duration-700 ease-in-out' : ''}`}
            style={reduced ? undefined : { transform: `translate3d(-${index * step}px, 0, 0)` }}
            onTransitionEnd={e => {
              // Only the track's own transform ends the step. The cards carry
              // transition-colors for the featured borderand those events
              // bubble up here too — acting on one ran the reset a second time
              // and pushed the index below zero.
              if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
              if (index < REVIEWS.length) return
              setSliding(false)
              setIndex(i => (i >= REVIEWS.length ? i - REVIEWS.length : i))
            }}
          >
            {[...REVIEWS, ...REVIEWS].map((review, i) => {
              const isFeatured = !reduced && i % REVIEWS.length === index % REVIEWS.length
              return (
                <figure
                  key={i}
                  aria-hidden={i >= REVIEWS.length}
                  className={`relative flex flex-shrink-0 flex-col rounded-2xl border bg-white p-6 shadow-sm transition-colors basis-full sm:basis-[calc((100%-1.25rem)/2)] lg:basis-[calc((100%-2.5rem)/3)] xl:basis-[calc((100%-3.75rem)/4)] ${
                    isFeatured ? 'border-primary-200' : 'border-gray-100'
                  }`}
                >
                  <Quote className="absolute right-5 top-5 h-8 w-8 text-indigo-50" aria-hidden="true" />

                  <Stars rating={review.rating} />

                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-600">
                    &ldquo;{review.body}&rdquo;
                  </blockquote>

                  <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-50 pt-4">
                    <Image
                      src={review.avatar}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 flex-shrink-0 rounded-full"
                      unoptimized
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{review.name}</p>
                      <p className="truncate text-xs text-gray-400">{review.city}, Pakistan</p>
                    </div>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
