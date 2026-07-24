'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, AlertTriangle, Info, Trash2, CalendarClock, Users,
} from 'lucide-react'
import Link from 'next/link'

const AMENITIES = [
  'WiFi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe',
  'Hair Dryer', 'Balcony', 'Sea View', 'Mountain View',
  'Garden View', 'Kitchen', 'Jacuzzi', 'Bathtub', 'Shower',
  'Iron & Board', 'Coffee Maker', 'Sofa', 'Workspace',
]

const schema = z.object({
  room_number:     z.string().min(1, 'Room number is required'),
  name:            z.string().optional(),
  floor:           z.coerce.number().min(0, 'Floor must be 0 or above'),
  price_per_night: z.coerce.number().min(1, 'Price must be at least 1'),
  room_type_id:    z.string().uuid('Select a room type'),
  max_adults:      z.coerce.number().min(1, 'At least 1 adult').max(20),
  max_children:    z.coerce.number().min(0).max(20),
  status:          z.enum(['available', 'booked', 'maintenance', 'cleaning']),
  amenities:       z.array(z.string()).default([]),
  notes:           z.string().optional(),
})
type FormData = z.infer<typeof schema>

export type RoomType = { id: string; name: string; capacity: number }

export interface EditRoomFormProps {
  room: {
    id: string
    room_number: string
    name: string | null
    floor: number
    price_per_night: number
    room_type_id: string
    max_adults: number
    max_children: number
    amenities: string[]
    status: string
    notes: string | null
    hotel_id: string
  }
  roomTypes: RoomType[]
  currency: string
  activeBookings: number
  upcomingBookings: number
}

export default function EditRoomForm({
  room, roomTypes, currency, activeBookings, upcomingBookings,
}: EditRoomFormProps) {
  const router = useRouter()
  const [deleting, setDeleting]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const totalLiveBookings = activeBookings + upcomingBookings

  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      room_number:     room.room_number,
      name:            room.name ?? '',
      floor:           room.floor,
      price_per_night: room.price_per_night,
      room_type_id:    room.room_type_id,
      max_adults:      room.max_adults,
      max_children:    room.max_children,
      status:          room.status as FormData['status'],
      amenities:       room.amenities ?? [],
      notes:           room.notes ?? '',
    },
  })

  const maxAdults   = Number(watch('max_adults')   ?? room.max_adults)
  const maxChildren = Number(watch('max_children') ?? room.max_children)
  const capacity    = maxAdults + maxChildren

  const watchedTypeId = watch('room_type_id')
  const typeChanged   = watchedTypeId !== room.room_type_id

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        name:  data.name  || null,
        notes: data.notes || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to update room'); return }
    toast.success('Room updated successfully')
    router.push('/hotel-admin/rooms')
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete room'); setConfirmDelete(false); return }
    toast.success('Room deleted')
    router.push('/hotel-admin/rooms')
    router.refresh()
  }

  return (
    <div className="space-y-5">

      {/* ── Booking warnings ─────────────────────────────────────────── */}
      {activeBookings > 0 && (
        <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Room is currently occupied</p>
            <p className="mt-0.5 text-amber-700">
              {activeBookings} active check-in{activeBookings > 1 ? 's' : ''} in progress.
              Changing type or status while a guest is checked in is not recommended.
            </p>
          </div>
        </div>
      )}

      {upcomingBookings > 0 && (
        <div className="flex gap-3 items-start bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <CalendarClock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{upcomingBookings} upcoming booking{upcomingBookings > 1 ? 's' : ''}</p>
            <p className="mt-0.5 text-blue-700">
              Price changes apply to <strong>new bookings only</strong>.
              Room number and name changes are safe — bookings link by internal ID.
            </p>
          </div>
        </div>
      )}

      {typeChanged && upcomingBookings > 0 && (
        <div className="flex gap-3 items-start bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          <Info className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p>
            You are changing the room type while {upcomingBookings} future booking{upcomingBookings > 1 ? 's' : ''} exist{upcomingBookings === 1 ? 's' : ''}.
            Guests booked based on the previous type — consider contacting them if the change is significant.
          </p>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">

        {/* Identity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Room Number</label>
            <input {...register('room_number')} className="input" />
            {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number.message}</p>}
            <p className="text-xs text-gray-400 mt-1">Bookings link by internal ID — safe to rename.</p>
          </div>
          <div>
            <label className="label">Floor</label>
            <input {...register('floor')} type="number" min={0} className="input" />
            {errors.floor && <p className="text-red-500 text-xs mt-1">{errors.floor.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Display Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <input {...register('name')} className="input" placeholder="e.g. Ocean View Suite, Corner Deluxe" />
          <p className="text-xs text-gray-400 mt-1">A friendly label shown to staff alongside the room number.</p>
        </div>

        {/* Type & Price */}
        <div>
          <label className="label">Room Type</label>
          <select {...register('room_type_id')} className="input">
            <option value="">Select type…</option>
            {roomTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} · up to {t.capacity} guest{t.capacity > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
        </div>

        <div>
          <label className="label">Price per Night ({currency})</label>
          <input {...register('price_per_night')} type="number" min={1} step="0.01" className="input" />
          {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
          {upcomingBookings > 0 && (
            <p className="text-xs text-gray-400 mt-1">New price applies to future bookings only.</p>
          )}
        </div>

        {/* Occupancy */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-400" /> Occupancy
          </label>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <div>
              <p className="text-xs text-gray-500 mb-1">Max Adults</p>
              <input {...register('max_adults')} type="number" min={1} max={20} className="input" />
              {errors.max_adults && <p className="text-red-500 text-xs mt-1">{errors.max_adults.message}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Max Children</p>
              <input {...register('max_children')} type="number" min={0} max={20} className="input" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Capacity</p>
              <div className="input bg-gray-50 text-gray-500 flex items-center justify-center font-semibold select-none">
                {capacity} guest{capacity !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="label">Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            {AMENITIES.map(a => (
              <label key={a} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  value={a}
                  {...register('amenities')}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">{a}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </select>
          {activeBookings > 0 && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Guest is currently checked in — change status only after checkout.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea {...register('notes')} className="input resize-none h-20" placeholder="Any notes about this room…" />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete room
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-red-600 font-medium">
                {totalLiveBookings > 0
                  ? `Room has ${totalLiveBookings} booking(s) — delete anyway?`
                  : 'Sure? This cannot be undone.'}
              </span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link href="/hotel-admin/rooms" className="btn-secondary text-sm">Cancel</Link>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
