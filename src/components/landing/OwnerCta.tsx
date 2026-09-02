import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

/**
 * Photography for the collage when there are not yet six listings carrying a
 * cover image. Real listings always come first — a wall of stock hotels on a
 * site with two properties reads as a stock photo, and the actual rooms are
 * more convincing than anything bought in. images.unsplash.com is already
 * allowed in next.config.ts remotePatterns.
 */
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&h=500&q=70',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&h=500&q=70',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&h=500&q=70',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&h=500&q=70',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&h=500&q=70',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&h=500&q=70',
]

/**
 * Where each photo sits in the collage. Percentages of the box rather than pixel
 * offsets, so the whole arrangement scales with the card instead of needing a
 * position per breakpoint. Ordered back to front — the big one is last.
 *
 * Between them the tiles span the box top to bottom (1% to 98%): slack here
 * shows up as dead space under the collage, because the box's aspect ratio sets
 * the height whether the photos reach the bottom or not. The 7/4 ratio is what
 * keeps the tiles landscape at these heights.
 */
const TILES = [
  { left: '0%',  top: '16%', width: '28%', height: '32%', rotate: '-7deg', z: 10 },
  { left: '30%', top: '1%',  width: '24%', height: '30%', rotate: '5deg',  z: 10 },
  { left: '66%', top: '8%',  width: '32%', height: '37%', rotate: '-4deg', z: 10 },
  { left: '2%',  top: '61%', width: '27%', height: '37%', rotate: '6deg',  z: 10 },
  { left: '68%', top: '56%', width: '30%', height: '42%', rotate: '-6deg', z: 10 },
  { left: '26%', top: '38%', width: '42%', height: '55%', rotate: '2deg',  z: 20 },
]

export default function OwnerCta({ covers = [] }: { covers?: string[] }) {
  // Real covers first, topped up with stock, deduplicated so one hotel does not
  // appear three times in the same collage.
  //
  // data: URIs are dropped. Some covers are stored inline as base64 rather than
  // as a storage URL, and the optimizer cannot resize those — a 176 KB cover
  // would ship whole, twice (HTML and RSC payload), to fill a 260px tile it is
  // already filling elsewhere on the page.
  const usable = covers.filter(src => /^https?:\/\//.test(src))
  const photos = [...new Set([...usable, ...FALLBACK_PHOTOS])].slice(0, TILES.length)

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="flex h-full flex-col">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-400">For hotel owners</p>
          <h3 className="text-3xl font-extrabold leading-tight text-gray-900">
            Got a property<br className="hidden sm:block" /> to list?
          </h3>
          <p className="mt-3 max-w-md text-gray-500">
            Grow your hotel business with BookQayam. List your property, reach more travelers and
            start receiving direct bookings with a simple, hassle-free setup.
          </p>

          <div className="mt-8">
            <Link
              href="/hotel-management"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-bold text-white transition-colors hover:bg-indigo-700"
            >
              Get started <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Collage. Decorative — the section already says what it is, so the
            tiles carry no alt text and no captions. */}
        <div className="relative aspect-[7/4] w-full" aria-hidden="true">
          {TILES.map((tile, i) => {
            const src = photos[i]
            if (!src) return null
            return (
              <div
                key={tile.left + tile.top}
                className="absolute overflow-hidden rounded-2xl bg-gray-100 shadow-lg ring-4 ring-white"
                style={{
                  left: tile.left,
                  top: tile.top,
                  width: tile.width,
                  height: tile.height,
                  transform: `rotate(${tile.rotate})`,
                  zIndex: tile.z,
                }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 260px, 40vw"
                  className="object-cover"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
