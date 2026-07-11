'use client'

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

export default function HotelLocationMap({ latitude, longitude, name, address }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'hotelos-google-maps',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number'
  const center = hasCoords ? { lat: latitude, lng: longitude } : null
  const directionsQuery = hasCoords ? `${latitude},${longitude}` : address
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`

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
      </p>

      <div className="mt-4 h-64 w-full sm:h-80">
        {!hasCoords ? (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            Exact map location not provided by this property yet.
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-50 text-sm text-gray-400">
            <span>Couldn&apos;t load the map.</span>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 underline">
              View on Google Maps
            </a>
          </div>
        ) : !isLoaded ? (
          <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
            Loading map…
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center!}
            zoom={15}
            options={{ mapId, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            <MarkerF position={center!} title={name} />
          </GoogleMap>
        )}
      </div>
    </div>
  )
}
