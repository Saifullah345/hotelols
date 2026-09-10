'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, X, Send, Loader2, LogIn, MapPin, Star, BedDouble,
  ChevronRight, Eye, Clock, Phone, Mail, Users, Wifi, Waves, Car,
  Coffee, Dumbbell, Sparkles, Tv, Wind, PawPrint, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatHotel {
  id: string
  name: string
  city: string
  address?: string
  cover_image?: string | null
  rating?: number
  review_count?: number
  description?: string
  min_price?: number | null
}

interface SearchResult {
  found: boolean
  city?: string
  hotels?: ChatHotel[]
  exhausted?: boolean
  no_match?: boolean
  nearby?: NearbyCity[]
}

interface BookingPrompt {
  action: 'require_login'
  hotel_id: string
  hotel_name: string
}

interface ChatRoom {
  id: string
  name: string
  room_type?: string | null
  price_per_night: number
  capacity: number
}

interface HotelDetail {
  id: string
  name: string
  city: string
  cover_image?: string | null
  rating?: number
  review_count?: number
  description?: string
  address?: string
  amenities?: string[]
  check_in_time?: string | null
  check_out_time?: string | null
  phone?: string | null
  email?: string | null
  available_rooms: ChatRoom[]
}

interface DetailResult {
  found: boolean
  check_in_date?: string | null
  check_out_date?: string | null
  hotel?: HotelDetail
}

interface SaveResult {
  action?: 'require_login'
  success?: boolean
  hotel_id?: string
  hotel_name?: string
}

interface MyBooking {
  id: string
  check_in: string
  check_out: string
  guests: number
  status: string
  total_amount: number
  hotel: { id: string; name: string; city: string; cover_image?: string | null }
  room: { name: string; price_per_night: number } | null
}

interface BookingsResult {
  action?: 'require_login'
  found?: boolean
  bookings?: MyBooking[]
}

interface NearbyCity { city: string; km: number }

interface CompareHotel {
  id: string; name: string; city: string; cover_image?: string | null
  rating: number; review_count: number; description: string
  amenities: string[]; min_price: number | null
}

interface CompareResult { found: boolean; hotels?: CompareHotel[] }

interface BookingRoom {
  id: string; name: string; room_type?: string | null
  price_per_night: number; capacity: number
}

interface InChatBookingResult {
  action?: 'require_login'
  found?: boolean
  hotel?: { id: string; name: string; city: string; cover_image?: string | null }
  available_rooms?: BookingRoom[]
  hotel_id?: string
  hotel_name?: string
}

// ── Amenity icon helper ───────────────────────────────────────────────────────

function getAmenityIcon(name: string): LucideIcon {
  const k = name.toLowerCase()
  if (k.includes('wifi') || k.includes('internet')) return Wifi
  if (k.includes('pool') || k.includes('swim')) return Waves
  if (k.includes('park') || k.includes('car')) return Car
  if (k.includes('breakfast') || k.includes('coffee') || k.includes('restaurant')) return Coffee
  if (k.includes('gym') || k.includes('fitness')) return Dumbbell
  if (k.includes('spa') || k.includes('massage')) return Sparkles
  if (k.includes('air') || k.includes('ac') || k.includes('condition')) return Wind
  if (k.includes('tv') || k.includes('television')) return Tv
  if (k.includes('pet')) return PawPrint
  return CheckCircle2
}

// ── Hotel detail card ─────────────────────────────────────────────────────────

function HotelDetailCard({ hotel, onBook, onClose }: { hotel: HotelDetail; onBook: (id: string, name: string) => void; onClose: () => void }) {
  function fmt(t: string | null | undefined) {
    if (!t) return '—'
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    const p = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-md w-full">
      {/* Cover image */}
      {hotel.cover_image && (
        <div className="relative h-40">
          <Image src={hotel.cover_image} alt={hotel.name} fill className="object-cover" sizes="(max-width:640px) 90vw, 360px" />
          {(hotel.rating ?? 0) > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 shadow text-xs font-bold text-gray-800">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {hotel.rating?.toFixed(1)}
              {(hotel.review_count ?? 0) > 0 && <span className="text-[10px] font-normal text-gray-400">({hotel.review_count})</span>}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Name + location */}
        <div>
          <p className="font-bold text-gray-900 text-base leading-snug">{hotel.name}</p>
          {hotel.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hotel.name, hotel.address, hotel.city].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1 mt-0.5 w-fit group/map"
            >
              <MapPin className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5 group-hover/map:text-indigo-600" />
              <span className="text-xs text-gray-500 group-hover/map:text-indigo-600 group-hover/map:underline">{hotel.address}, {hotel.city}</span>
            </a>
          )}
        </div>

        {/* Description */}
        {hotel.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{hotel.description}</p>
        )}

        {/* Check-in / Check-out */}
        {(hotel.check_in_time || hotel.check_out_time) && (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-indigo-800">Check-in:</span>{' '}
              <span className="text-indigo-700">{fmt(hotel.check_in_time)}</span>
              <span className="mx-2 text-indigo-300">·</span>
              <span className="font-semibold text-indigo-800">Check-out:</span>{' '}
              <span className="text-indigo-700">{fmt(hotel.check_out_time)}</span>
            </div>
          </div>
        )}

        {/* Amenities */}
        {(hotel.amenities?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {hotel.amenities!.map(a => {
                const Icon = getAmenityIcon(a)
                return (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    <Icon className="w-3 h-3 text-indigo-500" /> {a}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Available rooms */}
        {hotel.available_rooms.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Available rooms ({hotel.available_rooms.length})
            </p>
            <div className="space-y-2">
              {hotel.available_rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{room.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.room_type && <span className="text-[10px] text-gray-400">{room.room_type}</span>}
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                        <Users className="w-2.5 h-2.5" /> {room.capacity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-indigo-700">Rs {room.price_per_night.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">/night</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(hotel.phone || hotel.email) && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {hotel.phone && (
              <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-indigo-600 transition-colors">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {hotel.phone}
              </a>
            )}
            {hotel.email && (
              <a href={`mailto:${hotel.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-indigo-600 transition-colors truncate">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {hotel.email}
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/hotels/${hotel.id}`}
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Full Details
          </Link>
          <button
            onClick={() => onBook(hotel.id, hotel.name)}
            className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <BedDouble className="w-3.5 h-3.5" /> Book Now
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hotel card ────────────────────────────────────────────────────────────────

function HotelCard({ hotel, onSelect, onClose }: { hotel: ChatHotel; onSelect: (h: ChatHotel) => void; onClose: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-md h-full group">
      {/* Image */}
      <div className="relative h-40 bg-indigo-50">
        {hotel.cover_image ? (
          <Image
            src={hotel.cover_image}
            alt={hotel.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 80vw, 280px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 text-5xl">
            🏨
          </div>
        )}
        {hotel.min_price && (
          <div className="absolute bottom-2 right-2 rounded-xl bg-white/95 backdrop-blur-sm px-2.5 py-1 shadow-md">
            <span className="text-xs font-bold text-indigo-700">Rs {hotel.min_price.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">/night</span>
          </div>
        )}
        {(hotel.rating ?? 0) > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-2 py-0.5 shadow">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-800">{hotel.rating?.toFixed(1)}</span>
            {(hotel.review_count ?? 0) > 0 && (
              <span className="text-[10px] text-gray-400">({hotel.review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{hotel.name}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hotel.name, hotel.address, hotel.city].filter(Boolean).join(', '))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-0.5 mb-2 w-fit group/map"
        >
          <MapPin className="w-3 h-3 text-indigo-400 shrink-0 group-hover/map:text-indigo-600" />
          <span className="text-xs text-gray-500 group-hover/map:text-indigo-600 group-hover/map:underline">
            {hotel.address ? `${hotel.address}, ${hotel.city}` : hotel.city}
          </span>
        </a>
        {hotel.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-3">{hotel.description}</p>
        )}
        {/* Buttons — min 44px height for comfortable tap targets */}
        <div className="flex gap-2">
          <Link
            href={`/hotels/${hotel.id}`}
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
          <button
            onClick={() => onSelect(hotel)}
            className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <BedDouble className="w-3.5 h-3.5" />
            Book
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hotel slider ──────────────────────────────────────────────────────────────

function HotelSlider({ hotels, onSelect, onClose }: { hotels: ChatHotel[]; onSelect: (h: ChatHotel) => void; onClose: () => void }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-indigo-600">{hotels.length} hotel{hotels.length !== 1 ? 's' : ''} found</p>
        {hotels.length > 1 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            Swipe <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
      <div
        className="hotel-slider flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {hotels.map(hotel => (
          <div
            key={hotel.id}
            className="shrink-0"
            style={{ width: hotels.length === 1 ? '100%' : '83%', scrollSnapAlign: 'start' }}
          >
            <HotelCard hotel={hotel} onSelect={onSelect} onClose={onClose} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {hotels.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {hotels.map((_, i) => (
            <span key={i} className={`h-1 rounded-full bg-indigo-300 ${i === 0 ? 'w-4' : 'w-1.5'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Nearby cities fallback ────────────────────────────────────────────────────

function NearbyCitiesCard({ city, nearby, onSearch }: {
  city: string
  nearby: NearbyCity[]
  onSearch: (c: string) => void
}) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 w-full space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">📍</span>
        <div>
          <p className="text-sm font-bold text-amber-900">No hotels found in {city}</p>
          {nearby.length > 0 && <p className="text-xs text-amber-700">Try a nearby city:</p>}
        </div>
      </div>
      {nearby.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nearby.map(n => (
            <button
              key={n.city}
              onClick={() => onSearch(n.city)}
              className="flex items-center gap-1.5 rounded-full bg-white border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 active:scale-95 transition-all"
            >
              {n.city}
              <span className="text-amber-400 font-normal">{n.km} km</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Hotel compare card ────────────────────────────────────────────────────────

function CompareCard({ hotels, onSelect, onClose }: {
  hotels: CompareHotel[]
  onSelect: (h: CompareHotel) => void
  onClose: () => void
}) {
  const [a, b] = hotels
  if (!a || !b) return null

  // Compute verdict
  let aScore = 0, bScore = 0
  if ((a.rating ?? 0) > (b.rating ?? 0)) aScore++; else if ((b.rating ?? 0) > (a.rating ?? 0)) bScore++
  if (a.min_price !== null && b.min_price !== null) {
    if (a.min_price < b.min_price) aScore++; else if (b.min_price < a.min_price) bScore++
  }
  if (a.amenities.length > b.amenities.length) aScore++; else if (b.amenities.length > a.amenities.length) bScore++
  const winner = aScore > bScore ? a : bScore > aScore ? b : null

  return (
    <div className="w-full space-y-2">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Side-by-side comparison</p>
      <div className="flex gap-2">
        {[a, b].map((h, i) => (
          <div key={h.id} className={`flex-1 rounded-2xl overflow-hidden border shadow-sm bg-white ${winner?.id === h.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100'}`}>
            {winner?.id === h.id && (
              <div className="bg-indigo-600 text-white text-[10px] font-bold text-center py-1 tracking-wide">⭐ BETTER PICK</div>
            )}
            <div className="relative h-24">
              {h.cover_image ? (
                <Image src={h.cover_image} alt={h.name} fill className="object-cover" sizes="200px" />
              ) : (
                <div className="flex h-full items-center justify-center bg-indigo-50 text-3xl">🏨</div>
              )}
            </div>
            <div className="p-2.5 space-y-1.5">
              <p className="text-xs font-bold text-gray-900 line-clamp-1">{h.name}</p>
              <p className="text-[10px] text-gray-400">{h.city}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-gray-700">{h.rating.toFixed(1)}</span>
              </div>
              {h.min_price && (
                <p className="text-xs font-bold text-indigo-700">Rs {h.min_price.toLocaleString()}<span className="text-[10px] font-normal text-gray-400">/night</span></p>
              )}
              <p className="text-[10px] text-gray-400">{h.amenities.length} amenities</p>
              <div className="flex gap-1.5 pt-1">
                <Link href={`/hotels/${h.id}`} onClick={onClose} className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-[10px] font-semibold text-indigo-700 text-center hover:bg-indigo-100 transition-colors">
                  View
                </Link>
                <button onClick={() => onSelect(h)} className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-[10px] font-semibold text-white hover:bg-indigo-700 transition-colors">
                  Book
                </button>
              </div>
            </div>
            {i < hotels.length - 1 && <div />}
          </div>
        ))}
      </div>
      {winner ? (
        <p className="text-xs text-center text-gray-500">
          <span className="font-semibold text-indigo-700">{winner.name}</span> wins on rating{aScore > bScore && (a.min_price ?? 0) < (b.min_price ?? 0) ? ', price' : ''}{winner.amenities.length > (winner.id === a.id ? b : a).amenities.length ? ' & amenities' : ''}.
        </p>
      ) : (
        <p className="text-xs text-center text-gray-400">Both hotels are equally matched — choose by location!</p>
      )}
    </div>
  )
}

// ── In-chat booking wizard ────────────────────────────────────────────────────

function BookingFlowCard({ result, onClose }: { result: InChatBookingResult; onClose: () => void }) {
  const [selectedRoom, setSelectedRoom] = useState<BookingRoom | null>(null)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)

  if (result.action === 'require_login') {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white w-full p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <p className="text-sm font-bold text-indigo-900">Login to book</p>
        </div>
        <p className="text-xs text-indigo-700">Please log in to book <span className="font-semibold">{result.hotel_name}</span>.</p>
        <div className="flex gap-2">
          <Link href="/login" onClick={onClose} className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-indigo-600 text-xs font-semibold text-white gap-1.5"><LogIn className="w-3.5 h-3.5" /> Log in</Link>
          <Link href="/register" onClick={onClose} className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-indigo-700">Sign up</Link>
        </div>
      </div>
    )
  }

  if (!result.found || !result.hotel) return null

  const { hotel, available_rooms = [] } = result

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const total = selectedRoom ? selectedRoom.price_per_night * (nights || 1) : 0

  const today = new Date().toISOString().slice(0, 10)

  const handleProceed = () => {
    if (!selectedRoom || !checkIn || !checkOut) return
    const url = `/hotels/${hotel.id}/rooms/${selectedRoom.id}?check_in=${checkIn}&check_out=${checkOut}&adults=${guests}`
    onClose()
    window.location.href = url
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-md w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-indigo-600">
        {hotel.cover_image && (
          <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0">
            <Image src={hotel.cover_image} alt={hotel.name} fill className="object-cover" sizes="40px" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-white line-clamp-1">{hotel.name}</p>
          <p className="text-[10px] text-indigo-200">{hotel.city}</p>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Step 1: Pick room */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">1. Select room</p>
          {available_rooms.length === 0 ? (
            <p className="text-xs text-gray-400">No rooms available.</p>
          ) : (
            <div className="space-y-1.5">
              {available_rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${selectedRoom?.id === room.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'}`}
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{room.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {room.room_type ? `${room.room_type} · ` : ''}<Users className="w-2.5 h-2.5 inline" /> {room.capacity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-700">Rs {room.price_per_night.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">/night</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Pick dates */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">2. Dates</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 mb-1 block">Check-in</label>
              <input type="date" value={checkIn} min={today} onChange={e => setCheckIn(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-400" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 mb-1 block">Check-out</label>
              <input type="date" value={checkOut} min={checkIn || today} onChange={e => setCheckOut(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-400" />
            </div>
          </div>
        </div>

        {/* Step 3: Guests */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">3. Guests</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-colors">−</button>
            <span className="text-sm font-semibold text-gray-800 w-6 text-center">{guests}</span>
            <button onClick={() => setGuests(g => Math.min(selectedRoom?.capacity ?? 10, g + 1))} className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-colors">+</button>
            <span className="text-xs text-gray-400">guest{guests !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Summary + proceed */}
        {selectedRoom && checkIn && checkOut && nights > 0 && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-900">{nights} night{nights !== 1 ? 's' : ''}</p>
              <p className="text-[10px] text-indigo-600">Rs {selectedRoom.price_per_night.toLocaleString()} × {nights}</p>
            </div>
            <p className="text-base font-bold text-indigo-700">Rs {total.toLocaleString()}</p>
          </div>
        )}

        <button
          onClick={handleProceed}
          disabled={!selectedRoom || !checkIn || !checkOut || nights <= 0}
          className="w-full min-h-[44px] rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <BedDouble className="w-4 h-4" />
          {!selectedRoom ? 'Select a room first' : (!checkIn || !checkOut || nights <= 0) ? 'Pick dates' : 'Proceed to checkout →'}
        </button>
      </div>
    </div>
  )
}

// ── Save result card ─────────────────────────────────────────────────────────

function SaveResultCard({ result }: { result: SaveResult }) {
  if (result.action === 'require_login') {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white w-full p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <p className="text-sm font-bold text-indigo-900">Login required to save hotels</p>
        </div>
        <p className="text-xs text-indigo-700">Log in to save <span className="font-semibold">{result.hotel_name}</span> to your wishlist.</p>
        <div className="flex gap-2">
          <Link href="/login" className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors gap-1.5">
            <LogIn className="w-3.5 h-3.5" /> Log in
          </Link>
          <Link href="/register" className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors">
            Sign up free
          </Link>
        </div>
      </div>
    )
  }
  if (result.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 w-full">
        <span className="text-2xl">❤️</span>
        <div>
          <p className="text-sm font-bold text-emerald-800">Hotel saved!</p>
          <p className="text-xs text-emerald-700"><span className="font-semibold">{result.hotel_name}</span> has been added to your wishlist.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 w-full">
      Could not save hotel. Please try again.
    </div>
  )
}

// ── Booking history card ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  confirmed:   'bg-emerald-100 text-emerald-700',
  pending:     'bg-amber-100 text-amber-700',
  checked_in:  'bg-blue-100 text-blue-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled:   'bg-red-100 text-red-600',
}

function BookingHistoryCard({ result, onClose }: { result: BookingsResult; onClose: () => void }) {
  if (result.action === 'require_login') {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white w-full p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <p className="text-sm font-bold text-indigo-900">Login required</p>
        </div>
        <p className="text-xs text-indigo-700">Log in to view your booking history.</p>
        <div className="flex gap-2">
          <Link href="/login" className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors gap-1.5">
            <LogIn className="w-3.5 h-3.5" /> Log in
          </Link>
          <Link href="/register" className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors">
            Sign up free
          </Link>
        </div>
      </div>
    )
  }

  if (!result.found || !result.bookings?.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-5 text-center w-full">
        <p className="text-2xl mb-1">🗓️</p>
        <p className="text-sm font-semibold text-gray-700">No bookings yet</p>
        <p className="text-xs text-gray-400 mt-0.5">Your reservations will appear here.</p>
      </div>
    )
  }

  function nightsBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
  }

  return (
    <div className="w-full space-y-2">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Your recent bookings</p>
      {result.bookings.map(b => {
        const nights = nightsBetween(b.check_in, b.check_out)
        const statusLabel = b.status.replace('_', ' ')
        return (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            onClick={onClose}
            className="flex gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
          >
            {/* Hotel thumbnail */}
            <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-indigo-50">
              {b.hotel?.cover_image ? (
                <Image src={b.hotel.cover_image} alt={b.hotel.name ?? ''} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🏨</div>
              )}
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{b.hotel?.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{b.room?.name ?? 'Room'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {new Date(b.check_in).toLocaleDateString('en', { day: 'numeric', month: 'short' })} →{' '}
                {new Date(b.check_out).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                <span className="text-gray-400"> · {nights} night{nights !== 1 ? 's' : ''}</span>
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_STYLE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel}
                </span>
                <span className="text-[10px] font-bold text-indigo-700">Rs {b.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        )
      })}
      <Link
        href="/bookings"
        onClick={onClose}
        className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors py-1"
      >
        View all bookings →
      </Link>
    </div>
  )
}

// ── Login prompt ──────────────────────────────────────────────────────────────

function BookingPromptCard({ hotel_name }: { hotel_id: string; hotel_name: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white w-full">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-base">🏨</div>
          <p className="text-sm font-bold text-indigo-900">Ready to book!</p>
        </div>
        <p className="text-xs text-indigo-700 leading-relaxed">
          Please log in to complete your booking for{' '}
          <span className="font-semibold">{hotel_name}</span>.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 min-h-[44px] py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Log in to book
        </Link>
        <Link
          href="/register"
          className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white min-h-[44px] py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          Create free account
        </Link>
      </div>
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm shrink-0">🤖</div>
      <div className="rounded-2xl rounded-tl-sm bg-white shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status } = useChat({
    messages: [
      {
        id: 'welcome',
        role: 'assistant' as const,
        parts: [
          {
            type: 'text' as const,
            text: "Salam! 👋 I'm BookQayam's AI assistant.\n\nTell me which city you're looking for a hotel in and I'll show you the best options!\n\n(Roman Urdu mein bhi baat kar sakte hain, koi bhi city batayein!)",
          },
        ],
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [messages, open])

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        inputRef.current?.focus()
      }, 150)
    }
  }, [open])

  const handleHotelSelect = (hotel: ChatHotel) => {
    sendMessage({ text: `I want to book ${hotel.name}` })
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Global styles: hide slider scrollbar + safe-area helpers */}
      <style>{`
        .hotel-slider::-webkit-scrollbar { display: none; }
        .hotel-slider { -ms-overflow-style: none; scrollbar-width: none; }
        .quick-scroll::-webkit-scrollbar { display: none; }
        .quick-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .chat-panel-header { padding-top: max(0.75rem, env(safe-area-inset-top)); }
        .chat-input-bar { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
        .chat-fab { bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem)); }
      `}</style>

      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="chat-fab fixed right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
          aria-label="Open AI chat assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow">
            AI
          </span>
        </button>
      )}

      {/* Chat panel — full screen on mobile, floating card on sm+ */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="chat-panel-header flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">🤖</div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-600" />
              </div>
              <div>
                <p className="text-base font-bold text-white">BookQayam AI</p>
                <p className="text-xs text-indigo-200">Online</p>
              </div>
            </div>
            {/* Close — large tap target */}
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 bg-gray-50/80">
            {messages.map(msg => {
              const allParts = msg.parts as unknown as {
                type: string
                text?: string
                toolName?: string
                toolCallId?: string
                state?: string
                output?: unknown
              }[]

              const textParts = allParts.filter(p => p.type === 'text')
              const toolParts = allParts.filter(
                p => (p.type === 'dynamic-tool' || p.type?.startsWith('tool-')) && p.state === 'output-available'
              )
              const getToolName = (p: { type: string; toolName?: string }) =>
                p.toolName ?? (p.type.startsWith('tool-') ? p.type.slice(5) : '')

              const rawText = textParts.map(p => p.text ?? '').join('')
              const role = msg.role as string

              // Suppress long text when hotel cards are shown — only keep first sentence
              const hasHotelResults = toolParts.some(p => getToolName(p) === 'search_hotels')
              const textContent = hasHotelResults
                ? (() => {
                    const first = rawText.split(/(?<=[.!?])\s/)[0]?.trim() ?? ''
                    return first.length < 120 ? first : ''
                  })()
                : rawText

              // Skip assistant messages with nothing visible yet — TypingIndicator covers this state
              if (role === 'assistant' && !textContent && toolParts.length === 0) return null

              return (
                <div key={msg.id} className={`flex gap-2 items-end ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base mb-0.5">
                      🤖
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 min-w-0 ${role === 'user' ? 'items-end max-w-[78%]' : 'items-start w-full max-w-[88%]'}`}>
                    {/* Text bubble */}
                    {textContent && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words
                          ${role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm'
                            : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                          }`}
                      >
                        {textContent}
                      </div>
                    )}

                    {/* Tool results */}
                    {toolParts.map((toolPart, idx) => {
                      const key = toolPart.toolCallId ?? idx
                      const toolName = getToolName(toolPart)

                      if (toolName === 'search_hotels') {
                        const result = toolPart.output as SearchResult
                        if (!result.found || !result.hotels?.length) {
                          return (
                            <NearbyCitiesCard
                              key={key}
                              city={result.city ?? 'that area'}
                              nearby={result.nearby ?? []}
                              onSearch={city => sendMessage({ text: `Hotels in ${city}` })}
                            />
                          )
                        }
                        return <HotelSlider key={key} hotels={result.hotels} onSelect={handleHotelSelect} onClose={() => setOpen(false)} />
                      }

                      if (toolName === 'get_hotel_details') {
                        const result = toolPart.output as DetailResult
                        if (!result.found || !result.hotel) {
                          return (
                            <div key={key} className="rounded-2xl rounded-bl-sm bg-white text-gray-500 shadow-sm border border-gray-100 px-4 py-3 text-sm">
                              Could not load hotel details. Please try again.
                            </div>
                          )
                        }
                        return (
                          <div key={key} className="w-full space-y-2">
                            {result.check_in_date && result.check_out_date && (
                              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2">
                                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <p className="text-xs text-indigo-700 font-medium">
                                  Availability for{' '}
                                  {new Date(result.check_in_date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                                  {' → '}
                                  {new Date(result.check_out_date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                            )}
                            <HotelDetailCard
                              hotel={result.hotel}
                              onBook={(_id, name) => sendMessage({ text: `I want to book ${name}` })}
                              onClose={() => setOpen(false)}
                            />
                          </div>
                        )
                      }

                      if (toolName === 'compare_hotels') {
                        const result = toolPart.output as CompareResult
                        if (!result.found || !result.hotels?.length) return null
                        return (
                          <CompareCard
                            key={key}
                            hotels={result.hotels}
                            onSelect={h => sendMessage({ text: `I want to book ${h.name}` })}
                            onClose={() => setOpen(false)}
                          />
                        )
                      }

                      if (toolName === 'start_in_chat_booking') {
                        const result = toolPart.output as InChatBookingResult
                        return <BookingFlowCard key={key} result={result} onClose={() => setOpen(false)} />
                      }

                      if (toolName === 'save_hotel') {
                        const result = toolPart.output as SaveResult
                        return <SaveResultCard key={key} result={result} />
                      }

                      if (toolName === 'get_my_bookings') {
                        const result = toolPart.output as BookingsResult
                        return <BookingHistoryCard key={key} result={result} onClose={() => setOpen(false)} />
                      }

                      if (toolName === 'select_hotel_to_book') {
                        const result = toolPart.output as BookingPrompt
                        if (result.action !== 'require_login') return null
                        return (
                          <BookingPromptCard key={key} hotel_id={result.hotel_id} hotel_name={result.hotel_name} />
                        )
                      }

                      return null
                    })}
                  </div>

                  {role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold mb-0.5">
                      U
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick search chips — horizontal scroll, no wrap */}
          {messages.length === 1 && (
            <div className="bg-white border-t border-gray-100 px-3 pt-2.5 pb-2 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick searches</p>
              <div className="quick-scroll flex gap-2 overflow-x-auto pb-0.5">
                {['Hotels in Lahore', 'Karachi 4 star hotel', 'Murree mein sasta hotel', '2 log ke liye Islamabad', 'Rawalpindi 3000 se kam'].map(
                  prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage({ text: prompt })}
                      className="shrink-0 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all whitespace-nowrap"
                    >
                      {prompt}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Input bar — safe area padding at bottom on mobile */}
          <div className="chat-input-bar flex items-center gap-2 border-t border-gray-100 bg-white px-3 pt-3 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City batayein ya English mein type karein..."
              // font-size 16px prevents iOS Safari from auto-zooming on focus
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-indigo-400 focus:bg-white transition-colors placeholder:text-gray-400"
              style={{ fontSize: '16px' }}
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
