'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

const AMENITIES = [
  'WiFi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe',
  'Hair Dryer', 'Balcony', 'Sea View', 'Mountain View',
  'Garden View', 'Kitchen', 'Jacuzzi', 'Bathtub', 'Shower',
  'Iron & Board', 'Coffee Maker', 'Sofa', 'Workspace',
]

const schema = z.object({
  room_number:     z.string().min(1, 'Room number is required'),
  name:            z.string().min(1, 'Display name is required'),
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

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string; max_adults: number; max_children: number }[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'available', floor: 1, max_adults: 2, max_children: 0, amenities: [] },
  })

  const maxAdults      = Number(watch('max_adults')   ?? 2)
  const maxChildren    = Number(watch('max_children') ?? 0)
  const capacity       = maxAdults + maxChildren
  const selectedTypeId = watch('room_type_id')

  // Pre-fill occupancy from room type when type is selected
  useEffect(() => {
    const rt = roomTypes.find(t => t.id === selectedTypeId)
    if (rt) {
      setValue('max_adults',   rt.max_adults,   { shouldDirty: false })
      setValue('max_children', rt.max_children, { shouldDirty: false })
    }
  }, [selectedTypeId, roomTypes, setValue])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id)
        const { data } = await supabase
          .from('room_types')
          .select('id, name, max_adults, max_children')
          .eq('hotel_id', profile.tenant_id)
        if (data) setRoomTypes(data)
      }
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return
    const supabase = createClient()
    const { error } = await supabase.from('rooms').insert({
      ...data,
      hotel_id: tenantId,
      name:  data.name  || null,
      notes: data.notes || null,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Room added successfully')
    router.push('/hotel-admin/rooms')
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Add New Room</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">

        {/* ── Identity ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Room Number <span className="text-red-500">*</span></label>
            <input {...register('room_number')} className="input" placeholder="101" />
            {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number.message}</p>}
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

        {/* ── Type & Price ── */}
        <div>
          <label className="label">Room Type <span className="text-red-500">*</span></label>
          <select {...register('room_type_id')} className="input">
            <option value="">Select type…</option>
            {roomTypes.map(t => <option key={t.id} value={t.id} >{t.name}</option>)}
          </select>
          {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
        </div>

        <div>
          <label className="label">Price per Night <span className="text-red-500">*</span></label>
          <input {...register('price_per_night')} type="number" min={1} step="0.01" className="input" placeholder="150" />
          {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
        </div>

        {/* ── Occupancy ── */}
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
          <p className="text-xs text-gray-400 mt-1.5">Pre-filled from room type — override per room if this room differs.</p>
        </div>

        {/* ── Amenities ── */}
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

        {/* ── Status & Notes ── */}
        <div>
          <label className="label">Initial Status</label>
          <select {...register('status')} className="input">
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </select>
        </div>

        <div>
          <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea {...register('notes')} className="input resize-none h-20" placeholder="Any notes about this room…" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/hotel-admin/rooms" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Room
          </button>
        </div>
      </form>
    </div>
  )
}
