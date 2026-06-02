'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Search, User, BedDouble,
  MessageCircle, Phone, DoorOpen, Globe,
} from 'lucide-react'
import Link from 'next/link'
import type { BookingSource } from '@/types'

// ─── Schemas ─────────────────────────────────────────────────
const dateRefineMsg = { message: 'Check-out must be after check-in', path: ['check_out'] }

const onlineSchema = z.object({
  guest_email:      z.string().email('Valid email required'),
  room_id:          z.string().min(1, 'Select a room'),
  check_in:         z.string().min(1, 'Check-in date required'),
  check_out:        z.string().min(1, 'Check-out date required'),
  adults:           z.coerce.number().min(1, 'At least 1 adult'),
  children:         z.coerce.number().min(0),
  special_requests: z.string().optional(),
  status:           z.enum(['pending', 'confirmed']),
}).refine(
  (d) => new Date(d.check_out) > new Date(d.check_in),
  dateRefineMsg
)

const offlineSchema = z.object({
  guest_name:       z.string().min(2, 'Guest name required'),
  guest_phone:      z.string().min(7, 'Phone number required'),
  room_id:          z.string().min(1, 'Select a room'),
  check_in:         z.string().min(1, 'Check-in date required'),
  check_out:        z.string().min(1, 'Check-out date required'),
  adults:           z.coerce.number().min(1, 'At least 1 adult'),
  children:         z.coerce.number().min(0),
  special_requests: z.string().optional(),
  status:           z.enum(['pending', 'confirmed']),
}).refine(
  (d) => new Date(d.check_out) > new Date(d.check_in),
  dateRefineMsg
)

type OnlineForm  = z.infer<typeof onlineSchema>
type OfflineForm = z.infer<typeof offlineSchema>

type Room = {
  id: string
  room_number: string
  floor: number
  price_per_night: number
  room_type: { name: string } | null
}
type GuestProfile = { id: string; full_name: string; email: string }

// ─── Source config ────────────────────────────────────────────
const SOURCES: { value: BookingSource; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'walk_in',  label: 'Walk-in',  icon: DoorOpen,        color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'phone',    label: 'Phone',    icon: Phone,           color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle,   color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'online',   label: 'Online',   icon: Globe,           color: 'text-purple-600 bg-purple-50 border-purple-200' },
]

export default function NewBookingPage() {
  const router = useRouter()
  const [source, setSource]             = useState<BookingSource>('walk_in')
  const [rooms, setRooms]               = useState<Room[]>([])
  const [guest, setGuest]               = useState<GuestProfile | null>(null)
  const [guestNotFound, setGuestNotFound] = useState(false)
  const [searchingGuest, setSearchingGuest] = useState(false)
  const [nights, setNights]             = useState(0)
  const [totalAmount, setTotalAmount]   = useState(0)
  const [submitting, setSubmitting]     = useState(false)

  const isOffline = source !== 'online'

  const onlineForm = useForm<OnlineForm>({
    resolver: zodResolver(onlineSchema),
    defaultValues: { adults: 1, children: 0, status: 'confirmed' },
  })

  const offlineForm = useForm<OfflineForm>({
    resolver: zodResolver(offlineSchema),
    defaultValues: { adults: 1, children: 0, status: 'confirmed' },
  })

  const watchOnline  = onlineForm.watch
  const watchOffline = offlineForm.watch

  const [checkIn, checkOut, roomIdOnline]  = watchOnline(['check_in', 'check_out', 'room_id'])
  const [checkInOff, checkOutOff, roomIdOff] = watchOffline(['check_in', 'check_out', 'room_id'])

  const activeCheckIn  = isOffline ? checkInOff  : checkIn
  const activeCheckOut = isOffline ? checkOutOff : checkOut
  const activeRoomId   = isOffline ? roomIdOff   : roomIdOnline

  // Load rooms
  useEffect(() => {
    createClient()
      .from('rooms')
      .select('id, room_number, floor, price_per_night, room_type:room_types(name)')
      .order('room_number')
      .then(({ data }) => {
        if (data) {
          setRooms((data as unknown[]).map((r: unknown) => {
            const room = r as { id: string; room_number: string; floor: number; price_per_night: number; room_type: { name: string }[] | null }
            return { ...room, room_type: room.room_type?.[0] ?? null }
          }) as Room[])
        }
      })
  }, [])

  // Recalculate total
  useEffect(() => {
    if (!activeCheckIn || !activeCheckOut || !activeRoomId) {
      setNights(0); setTotalAmount(0); return
    }
    const n = Math.ceil((new Date(activeCheckOut).getTime() - new Date(activeCheckIn).getTime()) / 86400000)
    if (n <= 0) { setNights(0); setTotalAmount(0); return }
    const room = rooms.find(r => r.id === activeRoomId)
    setNights(n)
    setTotalAmount(n * (room?.price_per_night ?? 0))
  }, [activeCheckIn, activeCheckOut, activeRoomId, rooms])

  const lookupGuest = useCallback(async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return
    setSearchingGuest(true); setGuest(null); setGuestNotFound(false)
    const { data } = await createClient()
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim())
      .single()
    setSearchingGuest(false)
    if (data) { setGuest(data); setGuestNotFound(false) }
    else setGuestNotFound(true)
  }, [])

  const submitOffline = async (data: OfflineForm) => {
    setSubmitting(true)
    const res = await fetch('/api/admin/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_name:  data.guest_name,
        guest_phone: data.guest_phone,
        room_id:     data.room_id,
        check_in:    data.check_in,
        check_out:   data.check_out,
        adults:      data.adults,
        children:    data.children,
        special_requests: data.special_requests,
        status:  data.status,
        source,
      }),
    })
    setSubmitting(false)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create booking'); return }
    toast.success('Booking created')
    router.push('/hotel-admin/bookings')
  }

  const submitOnline = async (data: OnlineForm) => {
    if (!guest) { toast.error('Please find a valid guest first'); return }
    setSubmitting(true)
    const res = await fetch('/api/admin/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_user_id:    guest.id,
        room_id:          data.room_id,
        check_in:         data.check_in,
        check_out:        data.check_out,
        adults:           data.adults,
        children:         data.children,
        special_requests: data.special_requests,
        status:           data.status,
        source:           'online',
      }),
    })
    setSubmitting(false)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create booking'); return }
    toast.success('Booking created')
    router.push('/hotel-admin/bookings')
  }

  const today = new Date().toISOString().split('T')[0]

  // Shared room/dates/details block renderer
  const RoomDatesBlock = (reg: any, errs: Record<string, { message?: string }>, ci: string) => (
    <>
      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Room &amp; Dates</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Room</label>
            <select {...reg('room_id')} className="input">
              <option value="">Select a room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} — {r.room_type?.name ?? 'Standard'} · ${r.price_per_night}/night
                </option>
              ))}
            </select>
            {errs.room_id && <p className="text-red-500 text-xs mt-1">{errs.room_id.message}</p>}
          </div>
          <div>
            <label className="label">Check-in</label>
            <input {...reg('check_in')} type="date" min={today} className="input" />
            {errs.check_in && <p className="text-red-500 text-xs mt-1">{errs.check_in.message}</p>}
          </div>
          <div>
            <label className="label">Check-out</label>
            <input {...reg('check_out')} type="date" min={ci || today} className="input" />
            {errs.check_out && <p className="text-red-500 text-xs mt-1">{errs.check_out.message}</p>}
          </div>
        </div>
        {nights > 0 && totalAmount > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <BedDouble className="h-4 w-4" />{nights} night{nights !== 1 ? 's' : ''}
            </div>
            <span className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Adults</label>
            <input {...reg('adults')} type="number" min={1} className="input" />
            {errs.adults && <p className="text-red-500 text-xs mt-1">{errs.adults.message}</p>}
          </div>
          <div>
            <label className="label">Children</label>
            <input {...reg('children')} type="number" min={0} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select {...reg('status')} className="input">
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea {...reg('special_requests')} className="input resize-none" rows={3} placeholder="Any special requests..." />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/bookings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Booking</h2>
          <p className="text-gray-500 text-sm">Create a booking from any channel</p>
        </div>
      </div>

      {/* Source selector */}
      <div className="card p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Booking Source</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOURCES.map(s => {
            const Icon = s.icon
            const active = source === s.value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { setSource(s.value); setGuest(null); setGuestNotFound(false) }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium
                  ${active ? s.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
              >
                <Icon className="h-5 w-5" />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Offline booking (walk-in / phone / whatsapp) ── */}
      {isOffline && (
        <form onSubmit={offlineForm.handleSubmit(submitOffline)} className="space-y-5">
          <div className="card p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Guest Info</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Full Name</label>
                <input {...offlineForm.register('guest_name')} className="input" placeholder="John Smith" />
                {offlineForm.formState.errors.guest_name && (
                  <p className="text-red-500 text-xs mt-1">{offlineForm.formState.errors.guest_name.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="label">Phone Number</label>
                <input {...offlineForm.register('guest_phone')} className="input" placeholder="+1 555 000 0000" />
                {offlineForm.formState.errors.guest_phone && (
                  <p className="text-red-500 text-xs mt-1">{offlineForm.formState.errors.guest_phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {RoomDatesBlock(
            offlineForm.register,
            offlineForm.formState.errors as Record<string, { message?: string }>,
            checkInOff,
          )}

          <div className="flex justify-end gap-3">
            <Link href="/hotel-admin/bookings" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Booking
            </button>
          </div>
        </form>
      )}

      {/* ── Online booking (registered guest) ── */}
      {!isOffline && (
        <form onSubmit={onlineForm.handleSubmit(submitOnline)} className="space-y-5">
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Guest</p>
            <div>
              <label className="label">Guest Email</label>
              <div className="flex gap-2">
                <input
                  {...onlineForm.register('guest_email')}
                  type="email"
                  className="input flex-1"
                  placeholder="guest@example.com"
                />
                <button
                  type="button"
                  onClick={() => lookupGuest(onlineForm.getValues('guest_email'))}
                  disabled={searchingGuest}
                  className="btn-secondary flex items-center gap-1.5 text-sm shrink-0"
                >
                  {searchingGuest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Find
                </button>
              </div>
              {onlineForm.formState.errors.guest_email && (
                <p className="text-red-500 text-xs mt-1">{onlineForm.formState.errors.guest_email.message}</p>
              )}
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
                No customer found. Try a walk-in or phone booking instead, or{' '}
                <Link href="/super-admin/users/add" className="underline font-medium">add them as a user</Link>.
              </p>
            )}
          </div>

          {RoomDatesBlock(
            onlineForm.register,
            onlineForm.formState.errors as Record<string, { message?: string }>,
            checkIn,
          )}

          <div className="flex justify-end gap-3">
            <Link href="/hotel-admin/bookings" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Booking
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
