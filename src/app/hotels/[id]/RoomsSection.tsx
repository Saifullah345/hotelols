'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BedDouble, Users, Plus, Minus, Check, Calendar,
  Loader2, X, ArrowRight, LogIn, ShieldCheck,
} from 'lucide-react'

type Room = {
  id: string
  room_number: string
  name: string | null
  floor: number
  price_per_night: number
  max_adults: number
  max_children: number
  images: string[] | null
  amenities: string[] | null
  room_type: { name?: string } | null
}

interface Props {
  rooms: Room[]
  hotelId: string
  isLoggedIn: boolean
}

export default function RoomsSection({ rooms, hotelId, isLoggedIn }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults,   setAdults]   = useState(1)
  const [loading,  setLoading]  = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
      ))
    : 0

  const selectedRooms  = rooms.filter(r => selected.has(r.id))
  const totalPerNight  = selectedRooms.reduce((s, r) => s + r.price_per_night, 0)
  const grandTotal     = totalPerNight * nights

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleBookAll = async () => {
    if (!checkIn || !checkOut)  { toast.error('Select check-in and check-out dates'); return }
    if (nights <= 0)            { toast.error('Check-out must be after check-in');    return }
    if (!selected.size)         { toast.error('Select at least one room');             return }

    setLoading(true)
    let successCount = 0
    let errorCount   = 0

    for (const room of selectedRooms) {
      try {
        const res = await fetch('/api/bookings', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotel_id:  hotelId,
            room_id:   room.id,
            check_in:  checkIn,
            check_out: checkOut,
            adults,
            children:  0,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (res.ok) {
          successCount++
        } else {
          errorCount++
          toast.error(`${room.name ?? `Room ${room.room_number}`}: ${json.error ?? 'Booking failed'}`)
        }
      } catch {
        errorCount++
        toast.error(`${room.name ?? `Room ${room.room_number}`}: Network error`)
      }
    }

    setLoading(false)
    if (successCount > 0) {
      toast.success(
        `${successCount} booking${successCount > 1 ? 's' : ''} submitted! The hotel will contact you to confirm.`
      )
      router.push('/customer/bookings')
    }
  }

  if (!rooms.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
        No rooms available at this time — check back soon.
      </div>
    )
  }

  return (
    <>
      <div className={`space-y-4 ${selected.size > 0 ? 'pb-52 sm:pb-44' : ''}`}>
        {rooms.map(room => {
          const images     = (room.images as string[] | null) ?? []
          const amenities  = (room.amenities as string[] | null) ?? []
          const type       = room.room_type as { name?: string } | null
          const thumb      = images[0]
          const href       = `/hotels/${hotelId}/rooms/${room.id}`
          const isSelected = selected.has(room.id)

          return (
            <div
              key={room.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                isSelected
                  ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200'
                  : 'border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <Link href={href} className="sm:w-44 shrink-0 group">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={type?.name ?? 'Room'}
                      className="h-44 sm:h-full w-full object-cover group-hover:brightness-95 transition"
                    />
                  ) : (
                    <div className="flex h-44 sm:h-full w-full items-center justify-center bg-indigo-50">
                      <BedDouble className="h-10 w-10 text-indigo-300" />
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <Link href={href} className="hover:text-indigo-700 transition-colors">
                      <h3 className="font-semibold text-gray-900">
                        {room.name ?? `Room ${room.room_number}`}
                        {type?.name && (
                          <span className="ml-1.5 text-sm text-gray-400 font-normal">({type.name})</span>
                        )}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                      <span>Floor {room.floor}</span>
                      {room.max_adults > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {room.max_adults} adult{room.max_adults !== 1 ? 's' : ''}
                          {room.max_children > 0 ? `, ${room.max_children} children` : ''}
                        </span>
                      )}
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {amenities.slice(0, 4).map(a => (
                          <span key={a} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {a}
                          </span>
                        ))}
                        {amenities.length > 4 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            +{amenities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                    >
                      View details & extras <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Price + action */}
                  <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0 sm:text-right shrink-0">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        Rs {room.price_per_night.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">per night</p>
                    </div>

                    {isLoggedIn ? (
                      <button
                        type="button"
                        onClick={() => toggle(room.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {isSelected ? (
                          <><Check className="h-4 w-4" /> Selected</>
                        ) : (
                          <><Plus className="h-4 w-4" /> Select</>
                        )}
                      </button>
                    ) : (
                      <a
                        href={`/login?next=/hotels/${hotelId}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                      >
                        <LogIn className="h-3.5 w-3.5" /> Sign in to book
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Floating booking panel ─────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden">

            {/* Panel header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {selected.size}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">
                    {selected.size} room{selected.size > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-indigo-200 text-xs truncate">
                    {selectedRooms.map(r => r.name ?? `Room ${r.room_number}`).join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-white/70 hover:text-white p-1 transition-colors shrink-0"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">

                {/* Date pickers */}
                <div className="grid grid-cols-2 gap-3 flex-1 w-full sm:w-auto">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Check-in
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={e => {
                        setCheckIn(e.target.value)
                        if (checkOut && checkOut <= e.target.value) setCheckOut('')
                      }}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Check-out
                    </label>
                    <input
                      type="date"
                      min={checkIn || today}
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                {/* Adults counter */}
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Adults</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults(v => Math.max(1, v - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(v => v + 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Total + book button */}
                <div className="w-full sm:w-auto sm:text-right shrink-0">
                  {nights > 0 && (
                    <>
                      <p className="text-xs text-gray-500 mb-0.5">
                        {nights} night{nights !== 1 ? 's' : ''} · Rs {totalPerNight.toLocaleString()}/night
                      </p>
                      <p className="text-lg font-bold text-indigo-700 mb-2">
                        Total: Rs {grandTotal.toLocaleString()}
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleBookAll}
                    disabled={loading || !checkIn || !checkOut || nights <= 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</>
                    ) : (
                      <>Book {selected.size} Room{selected.size > 1 ? 's' : ''} Separately</>
                    )}
                  </button>
                  <div className="flex items-center justify-center sm:justify-end gap-1 mt-1.5 text-xs text-gray-400">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    {selected.size} separate booking{selected.size > 1 ? 's' : ''} · Pay at property
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
