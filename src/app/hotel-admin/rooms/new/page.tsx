'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Hash, Tag,
  Settings2, Camera, ImagePlus, X, Plus,
} from 'lucide-react'
import Link from 'next/link'
import RoomTypeModal, { type CreatedRoomType } from '../RoomTypeModal'
import { roomNameSchema, roomNumberSchema } from '@/lib/validation'

const schema = z.object({
  room_number:     roomNumberSchema,
  name:            roomNameSchema,
  floor:           z.coerce.number().min(0, 'Floor must be 0 or above'),
  price_per_night: z.coerce.number().min(1, 'Price must be at least 1'),
  room_type_id:    z.string().uuid('Select a room type'),
  max_adults:      z.coerce.number().min(1).max(20),
  max_children:    z.coerce.number().min(0).max(20),
  status:          z.enum(['available', 'booked', 'maintenance', 'cleaning']),
  images:          z.array(z.string()).default([]),
  notes:           z.string().optional(),
})
type RoomForm = z.infer<typeof schema>

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string; max_adults: number; max_children: number }[]>([])
  const [tenantId, setTenantId]   = useState<string | null>(null)
  const [typeModalOpen, setTypeModalOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RoomForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'available', floor: 1, max_adults: 2, max_children: 0, images: [],
    },
  })

  const images         = watch('images') ?? []
  const selectedTypeId = watch('room_type_id')

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

  const handleTypeCreated = (t: CreatedRoomType) => {
    setRoomTypes(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
    setValue('room_type_id', t.id, { shouldValidate: true, shouldDirty: true })
    setTypeModalOpen(false)
  }


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
  const onSubmit = async (data: RoomForm) => {
    if (!tenantId) return
    const supabase = createClient()
    const { error } = await supabase.from('rooms').insert({
      ...data,
      hotel_id: tenantId,
      notes:    data.notes || null,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Room added successfully')
    router.push('/hotel-admin/rooms')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add New Room</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to create a room</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

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
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Room Type <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setTypeModalOpen(true)}
                    disabled={!tenantId}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> New type
                  </button>
                </div>
                <select {...register('room_type_id')} className="input">
                  <option value="">Select type…</option>
                  {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
                {tenantId && roomTypes.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No types yet — create one with “New type”.</p>
                )}
              </div>
              <div>
                <label className="label">Price / Night <span className="text-red-500">*</span></label>
                <input {...register('price_per_night')} type="number" min={1} step="0.01" className="input" placeholder="0.00" />
                {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
              </div>
            </div>
          </div>

        </div>

        {/* ── Card 2: Room Photos ───────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
              <Camera className="h-3.5 w-3.5 text-pink-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Room Photos</h3>
            <span className="ml-auto text-xs text-gray-400">{images.length} / 12</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
            <p className="text-xs text-gray-400 text-center mt-3">
              First photo will be used as the cover image.
            </p>
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
            <label className="label">Initial Status</label>
            <select {...register('status')} className="input">
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('notes')} rows={3} className="input resize-none" placeholder="Any internal notes about this room…" />
          </div>
        </div>

        {/* ── Action bar ─────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href="/hotel-admin/rooms" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Room
          </button>
        </div>
      </form>

      {tenantId && (
        <RoomTypeModal
          hotelId={tenantId}
          open={typeModalOpen}
          onClose={() => setTypeModalOpen(false)}
          onCreated={handleTypeCreated}
        />
      )}
    </div>
  )
}
