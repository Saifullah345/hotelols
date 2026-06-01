'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Search, User, BedDouble } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  guest_email: z.string().email('Valid email required'),
  room_id: z.string().min(1, 'Select a room'),
  check_in: z.string().min(1, 'Check-in date required'),
  check_out: z.string().min(1, 'Check-out date required'),
  adults: z.coerce.number().min(1, 'At least 1 adult'),
  children: z.coerce.number().min(0),
  special_requests: z.string().optional(),
  status: z.enum(['pending', 'confirmed']),
}).refine(d => new Date(d.check_out) > new Date(d.check_in), {
  message: 'Check-out must be after check-in',
  path: ['check_out'],
})

type FormData = z.infer<typeof schema>

type Room = { id: string; room_number: string; floor: number; price_per_night: number; room_type: { name: string } | null }
type GuestProfile = { id: string; full_name: string; email: string }

export default function NewBookingPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [guest, setGuest] = useState<GuestProfile | null>(null)
  const [guestNotFound, setGuestNotFound] = useState(false)
  const [searchingGuest, setSearchingGuest] = useState(false)
  const [nights, setNights] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { adults: 1, children: 0, status: 'confirmed' },
  })

  const [checkIn, checkOut, roomId] = watch(['check_in', 'check_out', 'room_id'])

  // Load hotel rooms
  useEffect(() => {
    createClient()
      .from('rooms')
      .select('id, room_number, floor, price_per_night, room_type:room_types(name)')
      .order('room_number')
      .then(({ data }) => { 
        if (data) {
          const rooms = (data as any[]).map(room => ({
            ...room,
            room_type: room.room_type?.[0] || null
          }))
          setRooms(rooms as Room[])
        }
      })
  }, [])

  // Recalculate total when dates or room changes
  useEffect(() => {
    if (!checkIn || !checkOut || !roomId) { setNights(0); setTotalAmount(0); return }
    const n = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    if (n <= 0) { setNights(0); setTotalAmount(0); return }
    const room = rooms.find(r => r.id === roomId)
    setNights(n)
    setTotalAmount(n * (room?.price_per_night ?? 0))
  }, [checkIn, checkOut, roomId, rooms])

  const lookupGuest = useCallback(async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return
    setSearchingGuest(true)
    setGuest(null)
    setGuestNotFound(false)
    const { data } = await createClient()
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim())
      .single()
    setSearchingGuest(false)
    if (data) { setGuest(data); setGuestNotFound(false) }
    else setGuestNotFound(true)
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!guest) { toast.error('Please find a valid guest first'); return }

    const res = await fetch('/api/admin/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_user_id: guest.id,
        room_id: data.room_id,
        check_in: data.check_in,
        check_out: data.check_out,
        adults: data.adults,
        children: data.children,
        special_requests: data.special_requests,
        status: data.status,
      }),
    })

    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create booking'); return }

    toast.success('Booking created successfully')
    router.push('/hotel-admin/bookings')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/bookings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Booking</h2>
          <p className="text-gray-500 text-sm">Create a booking for a guest</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Guest lookup */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Guest</p>
          <div>
            <label className="label">Guest Email</label>
            <div className="flex gap-2">
              <input
                {...register('guest_email')}
                type="email"
                className="input flex-1"
                placeholder="guest@example.com"
              />
              <button
                type="button"
                onClick={() => lookupGuest(watch('guest_email'))}
                disabled={searchingGuest}
                className="btn-secondary flex items-center gap-1.5 text-sm shrink-0"
              >
                {searchingGuest
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
                Find
              </button>
            </div>
            {errors.guest_email && <p className="text-red-500 text-xs mt-1">{errors.guest_email.message}</p>}
          </div>

          {guest && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                {guest.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{guest.full_name}</p>
                <p className="text-xs text-gray-500">{guest.email}</p>
              </div>
            </div>
          )}
          {guestNotFound && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              No customer found with that email. Ask them to register first or{' '}
              <Link href="/super-admin/users/add" className="underline font-medium">add them as a user</Link>.
            </p>
          )}
        </div>

        {/* Room & Dates */}
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Room &amp; Dates</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Room</label>
              <select {...register('room_id')} className="input">
                <option value="">Select a room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_type?.name ?? 'Standard'} · ${r.price_per_night}/night
                  </option>
                ))}
              </select>
              {errors.room_id && <p className="text-red-500 text-xs mt-1">{errors.room_id.message}</p>}
            </div>

            <div>
              <label className="label">Check-in</label>
              <input {...register('check_in')} type="date" min={today} className="input" />
              {errors.check_in && <p className="text-red-500 text-xs mt-1">{errors.check_in.message}</p>}
            </div>

            <div>
              <label className="label">Check-out</label>
              <input {...register('check_out')} type="date" min={checkIn || today} className="input" />
              {errors.check_out && <p className="text-red-500 text-xs mt-1">{errors.check_out.message}</p>}
            </div>
          </div>

          {nights > 0 && totalAmount > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <BedDouble className="h-4 w-4" />
                {nights} night{nights !== 1 ? 's' : ''}
              </div>
              <span className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Guests & Notes */}
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Adults</label>
              <input {...register('adults')} type="number" min={1} className="input" />
              {errors.adults && <p className="text-red-500 text-xs mt-1">{errors.adults.message}</p>}
            </div>

            <div>
              <label className="label">Children</label>
              <input {...register('children')} type="number" min={0} className="input" />
            </div>

            <div>
              <label className="label">Booking Status</label>
              <select {...register('status')} className="input">
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea {...register('special_requests')} className="input resize-none" rows={3} placeholder="Any special requests..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hotel-admin/bookings" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Booking
          </button>
        </div>
      </form>
    </div>
  )
}
