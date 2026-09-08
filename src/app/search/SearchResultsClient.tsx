'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MapPin, Star, Heart, ChevronLeft, ChevronRight, ChevronDown, X, SlidersHorizontal, Map } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { enrichWithCoords, type MapHotel } from './SearchMap'

const SearchMap = dynamic(() => import('./SearchMap'), { ssr: false })

export type SearchHotel = {
  id: string
  name: string
  city: string | null
  country: string | null
  currency: string | null
  rating: number
  review_count?: number | null
  cover_image: string | null
  images: string[] | null
  amenities: string[] | null
  price: number
  beds?: number | null
}

interface Props {
  hotels: SearchHotel[]
  hasDates: boolean
  checkIn?: string
  checkOut?: string
  guests: number
  city?: string
  nights: number
}

const PER_PAGE = 12

// ─── Hotel card ───────────────────────────────────────────────────────────────
function HotelCard({ hotel, href, showDiscount }: { hotel: SearchHotel; href: string; showDiscount: boolean }) {
  const allImages = [hotel.cover_image, ...(hotel.images ?? [])].filter(Boolean) as string[]
  const [imgIdx, setImgIdx] = useState(0)
  const [saved, setSaved] = useState(false)
  const [imgError, setImgError] = useState(false)

  const prev = (e: React.MouseEvent) => { e.preventDefault(); setImgIdx(i => (i - 1 + allImages.length) % allImages.length); setImgError(false) }
  const next = (e: React.MouseEvent) => { e.preventDefault(); setImgIdx(i => (i + 1) % allImages.length); setImgError(false) }
  const beds = hotel.beds ?? 2
  const currentSrc = allImages[imgIdx] ?? ''
  const hasImage = allImages.length > 0 && !imgError && currentSrc

  return (
    <Link href={href} className="group block rounded-2xl bg-white">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
        {hasImage ? (
          /* background-image: base64 data-URLs display without leaking alt text on failure.
             A hidden <img> detects the load error and triggers the emoji fallback. */
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url('${currentSrc}')` }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSrc} alt="" onError={() => setImgError(true)} className="hidden" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl bg-gradient-to-br from-indigo-50 to-indigo-100">🏨</div>
        )}
        {showDiscount && (
          <div className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">-10% today</div>
        )}
        <button
          onClick={e => { e.preventDefault(); setSaved(s => !s) }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur transition hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        {allImages.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 transition">
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 transition">
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </button>
          </>
        )}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.slice(0, 5).map((_, i) => (
              <span key={i} className={`block h-1.5 w-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-3' : 'bg-white/60'}`} />
            ))}
          </div>
        )}
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">Entire hotel · {beds} bed{beds !== 1 ? 's' : ''}</p>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-gray-900">{hotel.name}</h3>
            <p className="mt-0.5 flex items-center gap-0.5 text-xs text-gray-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
            </p>
          </div>
          {hotel.rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-900">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {hotel.rating.toFixed(1)}
              {hotel.review_count ? <span className="font-normal text-gray-400 text-xs">({hotel.review_count})</span> : null}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-900 whitespace-nowrap">
          <span className="font-bold">{formatCurrency(hotel.price, hotel.currency ?? 'PKR')}</span>
          <span className="font-normal text-gray-500"> /night</span>
        </p>
      </div>
    </Link>
  )
}

// ─── Filter chip button ────────────────────────────────────────────────────────
function Chip({
  label, active, onClear, onClick,
}: { label: string; active: boolean; onClear?: () => void; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
      }`}
    >
      {label}
      {active && onClear ? (
        <span
          role="button"
          onClick={e => { e.stopPropagation(); onClear() }}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/40"
        >
          <X className="h-2.5 w-2.5" />
        </span>
      ) : (
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      )}
    </button>
  )
}

// ─── Dropdown wrapper ──────────────────────────────────────────────────────────
function Dropdown({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-0 top-full z-30 mt-2 min-w-[280px] rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
        {children}
      </div>
    </>
  )
}

// ─── Amenity options ───────────────────────────────────────────────────────────
const AMENITY_OPTIONS = ['WiFi', 'Parking', 'Pool', 'Gym', 'Restaurant', 'Air conditioning', 'Room service', 'Spa']

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const pages: (number | '…')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 pb-8 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
              p === page ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SearchResultsClient({ hotels, hasDates, checkIn, checkOut, guests, city, nights }: Props) {
  const [page, setPage] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter state
  const prices = useMemo(() => hotels.map(h => h.price), [hotels])
  const globalMin = useMemo(() => Math.floor(Math.min(...prices, 0)), [prices])
  const globalMax = useMemo(() => Math.ceil(Math.max(...prices, 100000)), [prices])

  const [priceMin, setPriceMin] = useState(globalMin)
  const [priceMax, setPriceMax] = useState(globalMax)
  const [minBeds, setMinBeds] = useState(0)
  const [placeType, setPlaceType] = useState<string>('')
  const [minRating, setMinRating] = useState(0)
  const [amenities, setAmenities] = useState<string[]>([])

  // Sync price bounds when hotel list changes (e.g. new search)
  useEffect(() => { setPriceMin(globalMin); setPriceMax(globalMax) }, [globalMin, globalMax])

  // Dropdown open state
  const [openFilter, setOpenFilter] = useState<'type' | 'price' | 'beds' | 'more' | null>(null)
  const toggle = (f: typeof openFilter) => setOpenFilter(v => (v === f ? null : f))

  // Derived active states
  const priceActive = priceMin > globalMin || priceMax < globalMax
  const bedsActive = minBeds > 0
  const typeActive = placeType !== ''
  const moreActive = minRating > 0 || amenities.length > 0
  const activeCount = [priceActive, bedsActive, typeActive, moreActive].filter(Boolean).length

  const resetAll = () => {
    setPriceMin(globalMin); setPriceMax(globalMax)
    setMinBeds(0); setPlaceType(''); setMinRating(0); setAmenities([])
  }

  // Filtered hotels
  const filtered = useMemo(() => {
    return hotels.filter(h => {
      if (h.price < priceMin || h.price > priceMax) return false
      if (bedsActive && (h.beds ?? 0) < minBeds) return false
      if (typeActive && placeType !== 'Entire hotel') return false
      if (minRating > 0 && h.rating < minRating) return false
      if (amenities.length > 0) {
        const hAmenities = (h.amenities ?? []).map(a => a.toLowerCase())
        if (!amenities.every(a => hAmenities.some(ha => ha.includes(a.toLowerCase())))) return false
      }
      return true
    })
  }, [hotels, priceMin, priceMax, bedsActive, minBeds, typeActive, placeType, minRating, amenities])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [priceMin, priceMax, minBeds, placeType, minRating, amenities])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const start = (page - 1) * PER_PAGE
  const pageHotels = filtered.slice(start, start + PER_PAGE)

  const mapHotels: MapHotel[] = enrichWithCoords(
    filtered.map(h => ({
      id: h.id,
      name: h.name,
      city: h.city,
      price: h.price,
      currency: h.currency ?? 'PKR',
      cover_image: h.cover_image,
      rating: h.rating,
      review_count: h.review_count,
      beds: h.beds,
    }))
  )

  const handleMapClick = useCallback((id: string) => {
    setActiveId(id)
    const el = listRef.current?.querySelector(`[data-hotel="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const dateQuery = hasDates ? `?check_in=${checkIn}&check_out=${checkOut}&adults=${guests}` : ''

  if (hotels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">🔍</div>
          <p className="text-lg font-medium text-gray-900">No hotels found</p>
          <p className="mt-1 text-sm text-gray-500">
            {hasDates ? 'Try different dates, a smaller party, or another destination.' : 'Try another destination or fewer guests.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 relative">
      {/* ── Left: hotel list ── */}
      <div
        className={`flex flex-col w-full lg:w-[55%] xl:w-[52%] ${mobileMapOpen ? 'hidden lg:flex' : 'flex'}`}
        ref={listRef}
      >
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-lg sm:text-xl font-semibold text-gray-900">Stays in {city || 'Pakistan'}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} stay{filtered.length !== 1 ? 's' : ''}
            {hasDates ? ` · ${checkIn?.slice(5)} – ${checkOut?.slice(5)} · ${guests} guest${guests !== 1 ? 's' : ''}` : ''}
          </p>

          {/* ── Filter chips — horizontally scrollable on mobile ── */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>

            {/* Type of place */}
            <div className="relative shrink-0">
              <Chip
                label={typeActive ? placeType : 'Type of place'}
                active={typeActive}
                onClear={() => setPlaceType('')}
                onClick={() => toggle('type')}
              />
              <Dropdown open={openFilter === 'type'} onClose={() => setOpenFilter(null)}>
                <p className="mb-3 text-sm font-semibold text-gray-900">Type of place</p>
                <div className="space-y-2">
                  {['Any type', 'Entire hotel', 'Guest house', 'Resort', 'Boutique hotel'].map(t => (
                    <label key={t} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="place-type"
                        checked={t === 'Any type' ? placeType === '' : placeType === t}
                        onChange={() => { setPlaceType(t === 'Any type' ? '' : t); setOpenFilter(null) }}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Price range */}
            <div className="relative shrink-0">
              <Chip
                label={priceActive ? `PKR ${(priceMin / 1000).toFixed(0)}k – PKR ${(priceMax / 1000).toFixed(0)}k` : 'Price range'}
                active={priceActive}
                onClear={() => { setPriceMin(globalMin); setPriceMax(globalMax) }}
                onClick={() => toggle('price')}
              />
              <Dropdown open={openFilter === 'price'} onClose={() => setOpenFilter(null)}>
                <p className="mb-3 text-sm font-semibold text-gray-900">Price per night</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Min</label>
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5">
                      <span className="text-xs text-gray-500">PKR</span>
                      <input
                        type="number"
                        value={priceMin}
                        min={globalMin}
                        max={priceMax - 1}
                        onChange={e => setPriceMin(Math.min(Number(e.target.value), priceMax - 1))}
                        className="w-full text-sm font-medium text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm mt-4">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Max</label>
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5">
                      <span className="text-xs text-gray-500">PKR</span>
                      <input
                        type="number"
                        value={priceMax}
                        min={priceMin + 1}
                        max={globalMax}
                        onChange={e => setPriceMax(Math.max(Number(e.target.value), priceMin + 1))}
                        className="w-full text-sm font-medium text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
                <input
                  type="range"
                  min={globalMin}
                  max={globalMax}
                  step={500}
                  value={priceMax}
                  onChange={e => setPriceMax(Math.max(Number(e.target.value), priceMin + 1))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>PKR {globalMin.toLocaleString()}</span>
                  <span>PKR {globalMax.toLocaleString()}+</span>
                </div>
              </Dropdown>
            </div>

            {/* Beds */}
            <div className="relative shrink-0">
              <Chip
                label={bedsActive ? `${minBeds}+ bed${minBeds !== 1 ? 's' : ''}` : 'Beds'}
                active={bedsActive}
                onClear={() => setMinBeds(0)}
                onClick={() => toggle('beds')}
              />
              <Dropdown open={openFilter === 'beds'} onClose={() => setOpenFilter(null)}>
                <p className="mb-3 text-sm font-semibold text-gray-900">Number of beds</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setMinBeds(n); setOpenFilter(null) }}
                      className={`h-10 w-12 rounded-xl border text-sm font-semibold transition ${
                        minBeds === n
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {n === 0 ? 'Any' : `${n}+`}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* More filters */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle('more')}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  moreActive
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters{activeCount > 0 ? ` (${activeCount})` : ''}
                {moreActive ? (
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); setMinRating(0); setAmenities([]) }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/40"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                )}
              </button>
              <Dropdown open={openFilter === 'more'} onClose={() => setOpenFilter(null)}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900">More filters</p>
                  <button type="button" onClick={resetAll} className="text-xs text-indigo-600 hover:underline font-medium">Reset all</button>
                </div>

                {/* Rating */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Minimum rating</p>
                <div className="flex gap-2 mb-5">
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMinRating(r)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        minRating === r
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {r === 0 ? 'Any' : <><Star className="h-3 w-3 fill-current" />{r}+</>}
                    </button>
                  ))}
                </div>

                {/* Amenities */}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Amenities</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {AMENITY_OPTIONS.map(a => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={amenities.includes(a)}
                        onChange={e => setAmenities(v => e.target.checked ? [...v, a] : v.filter(x => x !== a))}
                        className="accent-indigo-600 h-3.5 w-3.5"
                      />
                      <span className="text-sm text-gray-700">{a}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenFilter(null)}
                  className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Show {filtered.length} stay{filtered.length !== 1 ? 's' : ''}
                </button>
              </Dropdown>
            </div>
          </div>

          {/* No results after filtering */}
          {filtered.length === 0 && hotels.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">No stays match your filters.</p>
              <button type="button" onClick={resetAll} className="mt-2 text-sm font-semibold text-indigo-600 hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:gap-5 sm:px-6 lg:grid-cols-2 xl:grid-cols-3">
          {pageHotels.map((hotel, i) => (
            <div
              key={hotel.id}
              data-hotel={hotel.id}
              onMouseEnter={() => setActiveId(hotel.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <HotelCard hotel={hotel} href={`/hotels/${hotel.id}${dateQuery}`} showDiscount={(start + i) % 5 === 0} />
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: (listRef.current?.offsetTop ?? 0) - 64, behavior: 'smooth' }) }} />
        )}
      </div>

      {/* ── Right: map ── */}
      {/* On mobile: full-screen overlay when mobileMapOpen. On lg+: sticky sidebar. */}
      <div className={`
        ${mobileMapOpen
          ? 'fixed inset-0 z-50 flex flex-col'
          : 'hidden lg:block flex-1'}
      `}>
        <div className="relative h-full lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
          {/* Mobile: back to list button */}
          <button
            onClick={() => setMobileMapOpen(false)}
            className="lg:hidden absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-lg border border-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
            List
          </button>

          <div className="absolute top-3 right-4 z-10 hidden lg:flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow text-xs font-medium text-gray-700 border border-gray-200">
            <input type="checkbox" id="move-map" className="accent-gray-900" />
            <label htmlFor="move-map">Search as I move the map</label>
          </div>
          <SearchMap hotels={mapHotels} activeId={activeId} onHotelClick={handleMapClick} />
        </div>
      </div>

      {/* ── Mobile floating "Show map" button ── */}
      {!mobileMapOpen && (
        <button
          onClick={() => setMobileMapOpen(true)}
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl"
        >
          <Map className="h-4 w-4" />
          Show map
        </button>
      )}
    </div>
  )
}
