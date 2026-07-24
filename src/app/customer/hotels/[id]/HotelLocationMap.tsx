'use client'

import { useEffect, useRef, useState } from 'react'
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api'
import { MapPin, Navigation } from 'lucide-react'

interface Props {
  latitude?: number | null
  longitude?: number | null
  name: string
  address: string
}

const containerStyle = { width: '100%', height: '100%' }
const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined
// Must be a stable reference — a new array on every render would make
// useJsApiLoader think the requested libraries changed and reload the script.
const LIBRARIES: 'marker'[] = ['marker']

export default function HotelLocationMap({ latitude, longitude, name, address }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'hotelos-google-maps',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    // A Map ID switches the map to vector rendering, and vector maps render
    // legacy google.maps.Marker pins unreliably (they can silently no-op,
    // especially in WebViews) — Advanced Markers are what Google actually
    // supports there, and they require this library.
    libraries: LIBRARIES,
  })

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number'

  // Properties that haven't pinned an exact spot yet still have a name and
  // address, so fall back to geocoding those client-side rather than showing
  // a blank "not provided" box.
  const [geocoded, setGeocoded] = useState<{ lat: number; lng: number } | null>(null)
  const [geocodeFailed, setGeocodeFailed] = useState(false)

  useEffect(() => {
    if (hasCoords || !isLoaded) return
    let cancelled = false
    // The Maps script can finish loading its core library before the
    // Geocoder class is actually attached to `google.maps` — and if the
    // Geocoding API isn't enabled for this API key, constructing/calling it
    // can throw synchronously. Either way this is a "nice to have" fallback,
    // so failures here should never take down the whole page.
    try {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ address: `${name}, ${address}` }, (results, status) => {
        if (cancelled) return
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location
          setGeocoded({ lat: loc.lat(), lng: loc.lng() })
        } else {
          setGeocodeFailed(true)
        }
      })
    } catch (err) {
      console.error('Geocoding failed', err)
      if (!cancelled) setGeocodeFailed(true)
    }
    return () => {
      cancelled = true
    }
  }, [hasCoords, isLoaded, name, address])

  const center = hasCoords ? { lat: latitude, lng: longitude } : geocoded
  const isApproximate = !hasCoords && !!geocoded
  const directionsQuery = center ? `${center.lat},${center.lng}` : address
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  useEffect(() => {
    if (!map || !center || !mapId || !isLoaded) return
    // A Map ID that isn't actually provisioned for Advanced Markers in the
    // Google Cloud Console (or a `marker` library that hasn't finished
    // attaching to `google.maps` yet) makes this constructor throw — that
    // would otherwise crash the whole page since it runs in an effect with
    // no boundary. Losing the pin is a much smaller failure than that.
    try {
      if (!advancedMarkerRef.current) {
        advancedMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position: center, title: name })
      } else {
        advancedMarkerRef.current.position = center
      }
    } catch (err) {
      console.error('Could not place map marker', err)
    }
  }, [map, center, name, isLoaded])

  useEffect(() => {
    return () => {
      if (advancedMarkerRef.current) advancedMarkerRef.current.map = null
    }
  }, [])

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-0">
        <h2 className="text-xl font-bold text-gray-900">Location</h2>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <Navigation className="h-4 w-4" /> Get directions
        </a>
      </div>
      <p className="flex items-center gap-1.5 px-5 pt-2 text-sm text-gray-500">
        <MapPin className="h-3.5 w-3.5 shrink-0" /> {address}
        {isApproximate && <span className="text-gray-400">(approximate)</span>}
      </p>

      <div className="mt-4 h-64 w-full sm:h-80">
        {loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-50 text-sm text-gray-400">
            <span>Couldn&apos;t load the map.</span>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 underline">
              View on Google Maps
            </a>
          </div>
        ) : !center && geocodeFailed ? (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            Exact map location not provided by this property yet.
          </div>
        ) : !center ? (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            Loading map…
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={hasCoords ? 15 : 13}
            options={{ mapId, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
            onLoad={setMap}
            onUnmount={() => setMap(null)}
          >
            {/* Vector maps (mapId set) get an AdvancedMarkerElement via the
                effect above instead — legacy Marker doesn't reliably render
                on them. */}
            {!mapId && <MarkerF position={center} title={name} />}
          </GoogleMap>
        )}
      </div>
    </div>
  )
}
