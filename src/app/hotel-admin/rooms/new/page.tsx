'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Users, Hash, Tag, Sparkles,
  Settings2, Camera, ImagePlus, Plus, X,
} from 'lucide-react'
import Link from 'next/link'
import RoomTypeModal, { type CreatedRoomType } from '../RoomTypeModal'

const PREDEFINED = [
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
  images:          z.array(z.string()).default([]),
  notes:           z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string; max_adults: number; max_children: number }[]>([])
  const [tenantId, setTenantId]   = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')
  const [typeModalOpen, setTypeModalOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'available', floor: 1, max_adults: 2, max_children: 0,
      amenities: [], images: [],
    },
  })

  const amenities      = watch('amenities') ?? []
  const images         = watch('images')    ?? []
  const maxAdults      = Number(watch('max_adults')   ?? 2)
  const maxChildren    = Number(watch('max_children') ?? 0)
  const capacity       = maxAdults + maxChildren
  const selectedTypeId = watch('room_type_id')
  const customAmenities = amenities.filter(a => !PREDEFINED.includes(a))

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

  // ── Room type helpers ─────────────────────────────────────────────
  const handleTypeCreated = (t: CreatedRoomType) => {
    setRoomTypes(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
    setValue('room_type_id', t.id, { shouldValidate: true, shouldDirty: true })
    setTypeModalOpen(false)
  }

  // ── Amenity helpers ───────────────────────────────────────────────
  const toggleAmenity = (a: string) => {
    const next = amenities.includes(a)
      ? amenities.filter(x => x !== a)
      : [...amenities, a]
    setValue('amenities', next, { shouldDirty: true })
  }

  const addCustom = () => {
    const val = customInput.trim()
    if (!val) return
    if (amenities.map(a => a.toLowerCase()).includes(val.toLowerCase())) {
      toast.error('Amenity already added')
      return
    }
    setValue('amenities', [...amenities, val], { shouldDirty: true })
    setCustomInput('')
  }

  const removeAmenity = (a: string) => {
    setValue('amenities', amenities.filter(x => x !== a), { shouldDirty: true })
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
  const onSubmit = async (data: FormData) => {
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

          {/* Occupancy */}
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Occupancy</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Max Adults</p>
                <input {...register('max_adults')} type="number" min={1} max={20} className="input" />
                {errors.max_adults && <p className="text-red-500 text-xs mt-1">{errors.max_adults.message}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Max Children</p>
                <input {...register('max_children')} type="number" min={0} max={20} className="input" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Total Capacity</p>
                <div className="input bg-gray-50 text-gray-600 flex items-center justify-center font-semibold select-none">
                  {capacity} guest{capacity !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Pre-filled from room type — override if this room differs.</p>
          </div>
        </div>

        {/* ── Card 2: Amenities ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Amenities</h3>
            {amenities.length > 0 && (
              <span className="ml-auto text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {amenities.length} selected
              </span>
            )}
          </div>

          {/* Predefined pills */}
          <div className="flex flex-wrap gap-2">
            {PREDEFINED.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all select-none ${
                  amenities.includes(a)
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Custom amenities */}
          {customAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <p className="w-full text-xs text-gray-400 font-medium mb-1">Custom</p>
              {customAmenities.map(a => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-300 bg-violet-50 text-violet-700 text-sm font-medium"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeAmenity(a)}
                    className="text-violet-400 hover:text-violet-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add custom input */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
              placeholder="Add custom amenity…"
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* ── Card 3: Room Photos ────────────────────────────────────── */}
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

        {/* ── Card 4: Status & Notes ─────────────────────────────────── */}
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
