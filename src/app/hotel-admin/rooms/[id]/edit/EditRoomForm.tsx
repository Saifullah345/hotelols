'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, AlertTriangle, Info, Trash2, CalendarClock,
  Hash, Tag, Settings2, X, ImagePlus, Camera,
} from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  room_number:     z.string().min(1, 'Room number is required'),
  name:            z.string().min(1, 'Display name is required'),
  floor:           z.coerce.number().min(0, 'Floor must be 0 or above'),
  price_per_night: z.coerce.number().min(1, 'Price must be at least 1'),
  room_type_id:    z.string().uuid('Select a room type'),
  max_adults:      z.coerce.number().min(1).max(20),
  max_children:    z.coerce.number().min(0).max(20),
  status:          z.enum(['available', 'booked', 'maintenance', 'cleaning']),
  images:          z.array(z.string()).default([]),
  notes:           z.string().optional(),
})
type FormData = z.infer<typeof schema>

export type RoomType = { id: string; name: string; max_adults: number; max_children: number }

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
    images: string[] | null
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const totalLiveBookings = activeBookings + upcomingBookings

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
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
      images:          room.images ?? [],
      notes:           room.notes  ?? '',
    },
  })

  const images      = watch('images') ?? []
  const typeChanged = watch('room_type_id') !== room.room_type_id
  const selectedTypeId = watch('room_type_id')

  // Sync capacity from room type when type changes
  useEffect(() => {
    const rt = roomTypes.find(t => t.id === selectedTypeId)
    if (rt && selectedTypeId !== room.room_type_id) {
      setValue('max_adults',   rt.max_adults,   { shouldDirty: true })
      setValue('max_children', rt.max_children, { shouldDirty: true })
    }
  }, [selectedTypeId, roomTypes, room.room_type_id, setValue])

  // ── Image helpers ─────────────────────────────────────────────────
  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (images.length + files.length > 12) {
      toast.error('Maximum 12 photos allowed')
      e.target.value = ''
      return
    }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setValue('images', [...(watch('images') ?? []), reader.result as string], { shouldDirty: true })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    setValue('images', images.filter((_, i) => i !== idx), { shouldDirty: true })
  }

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, notes: data.notes || null }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to update room'); return }
    toast.success('Room updated')
    router.push('/hotel-admin/rooms')
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete room'); setDeleteOpen(false); return }
    toast.success('Room deleted')
    router.push('/hotel-admin/rooms')
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Booking warnings ───────────────────────────────────────── */}
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
            <CalendarClock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{upcomingBookings} upcoming booking{upcomingBookings > 1 ? 's' : ''}</p>
              <p className="mt-0.5 text-blue-700">
                Price changes apply to <strong>new bookings only</strong>. Room number and name are safe to rename.
              </p>
            </div>
          </div>
        )}

        {typeChanged && upcomingBookings > 0 && (
          <div className="flex gap-3 items-start bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p>
              You are changing the room type while {upcomingBookings} future booking{upcomingBookings > 1 ? 's' : ''} exist{upcomingBookings === 1 ? 's' : ''}.
              Consider contacting guests if the change is significant.
            </p>
          </div>
        )}

        {/* ── Card 1: Identity & Pricing ─────────────────────────────── */}
        <div className="card divide-y divide-gray-100 overflow-hidden">

          {/* Room Identity */}
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Hash className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Room Identity</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Room Number</label>
                <input {...register('room_number')} className="input" />
                {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number.message}</p>}
                <p className="text-xs text-gray-400 mt-1">Safe to rename — bookings link by ID.</p>
              </div>
              <div>
                <label className="label">Floor</label>
                <input {...register('floor')} type="number" min={0} className="input" />
                {errors.floor && <p className="text-red-500 text-xs mt-1">{errors.floor.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Display Name <span className="text-red-500">*</span></label>
              <input {...register('name')} className="input" placeholder="e.g. Ocean View Suite, Corner Deluxe" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
          </div>

          {/* Type & Pricing */}
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Tag className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Type & Pricing</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Room Type</label>
                <select {...register('room_type_id')} className="input">
                  <option value="">Select type…</option>
                  {roomTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
                <p className="text-xs text-gray-400 mt-1">Capacity &amp; amenities come from the type.</p>
              </div>
              <div>
                <label className="label">Price / Night ({currency})</label>
                <input {...register('price_per_night')} type="number" min={1} step="0.01" className="input" />
                {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
                {upcomingBookings > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Applies to future bookings only.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2: Room Photos ────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
              <Camera className="h-3.5 w-3.5 text-pink-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Room Photos</h3>
            <span className="ml-auto text-xs text-gray-400">{images.length} / 12</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
              </div>
            ))}
            {images.length < 12 && (
              <label className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors group">
                <ImagePlus className="h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                <span className="text-xs text-gray-400 group-hover:text-blue-500 mt-1.5 font-medium transition-colors">
                  {images.length === 0 ? 'Add photos' : 'Add more'}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              </label>
            )}
          </div>
          {images.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-3">First photo will be used as the cover image.</p>
          )}
        </div>

        {/* ── Card 3: Status & Notes ─────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Settings2 className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Status & Notes</h3>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
            {activeBookings > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                Guest is currently checked in — change status only after checkout.
              </p>
            )}
          </div>
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={3} className="input resize-none" placeholder="Any internal notes about this room…" />
          </div>
        </div>

        {/* ── Action bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pt-2 pb-6">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            <Trash2 className="h-4 w-4" /> Delete Room
          </button>
          <div className="flex items-center gap-3">
            <Link href="/hotel-admin/rooms" className="btn-secondary text-sm">Cancel</Link>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* ── Delete modal ───────────────────────────────────────────── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Room {room.room_number}?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {totalLiveBookings > 0
                ? `This room has ${totalLiveBookings} active or upcoming booking${totalLiveBookings > 1 ? 's' : ''}. Deleting it may impact those guests.`
                : 'This action cannot be undone. All room data will be permanently removed.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Deleting…' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
