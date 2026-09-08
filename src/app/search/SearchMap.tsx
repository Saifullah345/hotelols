'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

export type MapHotel = {
  id: string
  name: string
  lat: number
  lng: number
  price: number
  currency: string
  cover_image?: string | null
  rating?: number
  review_count?: number | null
  beds?: number | null
  city?: string | null
}

interface Props {
  hotels: MapHotel[]
  activeId: string | null
  onHotelClick: (id: string) => void
}

// City centre coordinates for Pakistani cities
const CITY_COORDS: Record<string, [number, number]> = {
  karachi:     [24.8607,  67.0011],
  lahore:      [31.5204,  74.3587],
  islamabad:   [33.6844,  73.0479],
  rawalpindi:  [33.6007,  73.0679],
  faisalabad:  [31.4504,  73.1350],
  multan:      [30.1575,  71.5249],
  peshawar:    [34.0151,  71.5249],
  quetta:      [30.1798,  66.9750],
  sialkot:     [32.4945,  74.5229],
  hyderabad:   [25.3960,  68.3578],
  gujranwala:  [32.1877,  74.1945],
  abbottabad:  [34.1688,  73.2215],
  murree:      [33.9074,  73.3940],
  naran:       [34.9022,  73.6536],
  swat:        [35.2227,  72.4258],
  gilgit:      [35.9208,  74.3083],
  skardu:      [35.2971,  75.6333],
  wah:         [33.7836,  72.7464],
}

function cityCoords(city: string | null | undefined): [number, number] {
  const key = (city ?? '').toLowerCase().trim()
  if (CITY_COORDS[key]) return CITY_COORDS[key]
  // Partial match
  const match = Object.keys(CITY_COORDS).find(c => key.includes(c) || c.includes(key))
  return match ? CITY_COORDS[match] : [30.3753, 69.3451] // Pakistan centre
}

// Jitter hotels in the same city so pins don't stack
function jitter(val: number, seed: number) {
  const rng = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return val + (rng - Math.floor(rng) - 0.5) * 0.06
}

export function enrichWithCoords(
  hotels: Array<{
    id: string; name: string; city: string | null; price: number; currency: string
    cover_image?: string | null; rating?: number; review_count?: number | null; beds?: number | null
  }>
): MapHotel[] {
  return hotels.map((h, i) => {
    const [baseLat, baseLng] = cityCoords(h.city)
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      lat: jitter(baseLat, i * 2),
      lng: jitter(baseLng, i * 2 + 1),
      price: h.price,
      currency: h.currency,
      cover_image: h.cover_image,
      rating: h.rating,
      review_count: h.review_count,
      beds: h.beds,
    }
  })
}

function formatPrice(price: number, currency: string) {
  if (price >= 1000) return `${currency} ${Math.round(price / 1000)}k`
  return `${currency} ${Math.round(price)}`
}

function buildCardHTML(hotel: MapHotel): string {
  const priceLabel = formatPrice(hotel.price, hotel.currency)
  const beds = hotel.beds ?? 2
  const rating = (hotel.rating ?? 0).toFixed(1)
  const hasRating = (hotel.rating ?? 0) > 0
  const reviewCount = hotel.review_count ?? 0
  const hasImg = hotel.cover_image

  return `
    <a href="/hotels/${hotel.id}" class="mhc" style="text-decoration:none;color:inherit;display:block">
      <div class="mhc-img" ${hasImg ? `style="background-image:url('${hotel.cover_image}')"` : ''}>
        ${!hasImg ? '<div class="mhc-noimg">🏨</div>' : ''}
        <div class="mhc-badge">-10% today</div>
        <div class="mhc-heart">&#9825;</div>
      </div>
      <div class="mhc-body">
        <p class="mhc-type">Entire hotel &middot; ${beds} bed${beds !== 1 ? 's' : ''}</p>
        <h3 class="mhc-name">${hotel.name}</h3>
        ${hotel.city ? `<p class="mhc-loc">${hotel.city}</p>` : ''}
        <div class="mhc-footer">
          <span class="mhc-price">${priceLabel}</span>
          ${hasRating ? `<span class="mhc-rating">&#9733; ${rating}${reviewCount ? ` (${reviewCount})` : ''}</span>` : ''}
        </div>
      </div>
    </a>
  `
}

export default function SearchMap({ hotels, activeId, onHotelClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamic import to avoid SSR issues
    import('leaflet').then(L => {
      // Fix default marker icon paths broken by webpack
      // @ts-expect-error leaflet internals
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const PAKISTAN_BOUNDS = L.latLngBounds([23.5, 61.0], [37.0, 77.5])

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 6,
        maxZoom: 18,
        maxBounds: PAKISTAN_BOUNDS,
        maxBoundsViscosity: 1.0,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      mapRef.current = map

      // Add price markers with card popups
      hotels.forEach(hotel => {
        const isActive = hotel.id === activeId
        const icon = L.divIcon({
          className: '',
          html: `<div class="map-price-pin${isActive ? ' active' : ''}">${formatPrice(hotel.price, hotel.currency)}</div>`,
          iconSize: [80, 30],
          iconAnchor: [40, 15],
        })

        const popup = L.popup({
          className: 'map-card-popup',
          maxWidth: 252,
          minWidth: 240,
          offset: [0, -18],
          closeButton: false,
          autoClose: true,
          closeOnClick: false,
        }).setContent(buildCardHTML(hotel))

        const marker = L.marker([hotel.lat, hotel.lng], { icon })
          .addTo(map)
          .bindPopup(popup)
          .on('click', () => { onHotelClick(hotel.id) })

        markersRef.current.set(hotel.id, marker)
      })

      // Always open on full Pakistan — price pins are visible at this zoom level.
      // We never try to fit hotel bounds because hotels span all of Pakistan and
      // the resulting zoom would show surrounding countries.
      map.fitBounds(PAKISTAN_BOUNDS, { padding: [10, 10] })
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update marker styles when activeId changes
  useEffect(() => {
    import('leaflet').then(L => {
      markersRef.current.forEach((marker, id) => {
        const isActive = id === activeId
        const hotel = hotels.find(h => h.id === id)
        if (!hotel) return
        const icon = L.divIcon({
          className: '',
          html: `<div class="map-price-pin${isActive ? ' active' : ''}">${formatPrice(hotel.price, hotel.currency)}</div>`,
          iconSize: [80, 30],
          iconAnchor: [40, 15],
        })
        marker.setIcon(icon)
      })
    })
  }, [activeId, hotels])

  return (
    <>
      <style>{`
        .map-price-pin {
          background: white;
          border: 1.5px solid #e5e7eb;
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .map-price-pin:hover, .map-price-pin.active {
          background: #111827;
          color: #fff;
          border-color: #111827;
          transform: scale(1.08);
          z-index: 1000;
        }
        .leaflet-container { font-family: system-ui, -apple-system, sans-serif; }

        /* ── Hotel card popup ── */
        .map-card-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22);
          border: none;
        }
        .map-card-popup .leaflet-popup-content {
          margin: 0;
          width: 240px !important;
          line-height: 1.4;
        }
        .map-card-popup .leaflet-popup-tip-container { display: none; }

        .mhc { display: block; background: white; border-radius: 16px; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
        .mhc-img {
          width: 100%;
          height: 160px;
          background: #f3f4f6;
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .mhc-noimg {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 42px;
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
        }
        .mhc-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #ef4444;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .mhc-heart {
          position: absolute;
          top: 8px;
          right: 10px;
          background: rgba(255,255,255,0.85);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
        }
        .mhc-body { padding: 11px 13px 13px; }
        .mhc-type { font-size: 11px; color: #6b7280; margin: 0 0 2px; }
        .mhc-name {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mhc-loc { font-size: 11px; color: #9ca3af; margin: 0 0 8px; }
        .mhc-footer { display: flex; align-items: center; justify-content: space-between; }
        .mhc-price { font-size: 14px; font-weight: 700; color: #111827; }
        .mhc-rating { font-size: 12px; font-weight: 600; color: #111827; }
      `}</style>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={containerRef} className="h-full w-full" />
    </>
  )
}
