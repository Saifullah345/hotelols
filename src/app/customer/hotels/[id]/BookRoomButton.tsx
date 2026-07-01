'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  roomId: string
  hotelId: string
  pricePerNight: number
}

export default function BookRoomButton({ roomId, hotelId, pricePerNight }: Props) {
  const [open, setOpen] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const total = nights * pricePerNight

  const handleBook = async () => {
    if (!checkIn || !checkOut) { toast.error('Select dates'); return }
    setLoading(true)

    // Go through the server route so the booking + payment are created and the
    // hotel's admins get a notification (a client can't write notifications to
    // another user under RLS).
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: hotelId,
          room_id: roomId,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          adults: guests,
          children: 0,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? 'Could not create booking')
        setLoading(false)
        return
      }
      toast.success('Booking created! Awaiting confirmation.')
      router.push('/customer/bookings')
    } catch {
      toast.error('Could not create booking')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-primary text-sm py-1.5 px-4">Book Now</button>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 mt-2 text-left min-w-52">
          <div className="space-y-2 mb-3">
            <div>
              <label className="text-xs text-gray-500">Check-in</label>
              <input type="date" min={today} value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input text-sm py-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Check-out</label>
              <input type="date" min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="input text-sm py-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Guests</label>
              <input type="number" min={1} max={10} value={guests} onChange={e => setGuests(Number(e.target.value))} className="input text-sm py-1" />
            </div>
          </div>
          {nights > 0 && (
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {nights} night{nights > 1 ? 's' : ''} = <span className="text-primary-600">${total}</span>
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1 text-xs py-1.5">Cancel</button>
            <button onClick={handleBook} disabled={loading} className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
