'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient, getBrowserUser } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Hash, Tag, Camera, ImagePlus, X,
  Plus, Layers, Minus, Users, Baby, CheckCircle2,
  Wrench, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import RoomTypeModal, { type RoomTypeRecord } from '../RoomTypeModal'
import { roomNameSchema, roomNumberSchema } from '@/lib/validation'

type Floor = { id: string; floor_number: number; name: string }

const schema = z.object({
  room_number:     roomNumberSchema,
  name:            roomNameSchema,
  floor:           z.coerce.number().min(0, 'Floor must be 0 or above'),
  price_per_night: z.coerce.number().min(1, 'Price must be at least 1'),
  // Optional: a room is only offered for short stays once it has an hourly rate.
  rate_per_hour:   z.union([z.literal(''), z.coerce.number().min(1, 'Hourly rate must be at least 1')]).optional(),
  room_type_id:    z.string().uuid('Select a room type'),
  max_adults:      z.coerce.number().min(1).max(20),
  max_children:    z.coerce.number().min(0).max(20),
  status:          z.enum(['available', 'maintenance', 'cleaning']),
  images:          z.array(z.string()).default([]),
  notes:           z.string().optional(),
})
type RoomForm = z.infer<typeof schema>

const STATUS_OPTIONS = [
  { value: 'available',   label: 'Available',   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',   border: 'border-emerald-400', ring: 'ring-emerald-200' },
  { value: 'maintenance', label: 'Maintenance',  icon: Wrench,       color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-400',   ring: 'ring-amber-200'   },
  { value: 'cleaning',    label: 'Cleaning',     icon: Sparkles,     color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-400',    ring: 'ring-blue-200'    },
] as const

function SectionCard({ num, title, accent, children }: { num: number; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 border-l-4 ${accent}`}>
        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm tracking-wide">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Stepper({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 transition-colors"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-base font-semibold text-gray-900 tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string; max_adults: number; max_children: number }[]>([])
  const [tenantId, setTenantId]   = useState<string | null>(null)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [floors, setFloors] = useState<Floor[]>([])

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RoomForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'available', floor: 0, max_adults: 2, max_children: 0, images: [],
    },
  })

  const images         = watch('images') ?? []
  const selectedTypeId = watch('room_type_id')
  const status         = watch('status')
  const maxAdults      = watch('max_adults')
  const maxChildren    = watch('max_children')

  useEffect(() => {
    const rt = roomTypes.find(t => t.id === selectedTypeId)
    if (rt) {
      setValue('max_adults',   rt.max_adults,   { shouldDirty: false })
      setValue('max_children', rt.max_children, { shouldDirty: false })
    }
  }, [selectedTypeId, roomTypes, setValue])

  useEffect(() => {
    const supabase = createClient()
    getBrowserUser(supabase).then(async (user) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id)
        const [{ data: types }, { data: floorData }] = await Promise.all([
          supabase.from('room_types').select('id, name, max_adults, max_children').eq('hotel_id', profile.tenant_id),
          supabase.from('hotel_floors').select('id, floor_number, name').eq('hotel_id', profile.tenant_id).order('floor_number'),
        ])
        if (types) setRoomTypes(types)
        if (floorData) setFloors(floorData)
      }
    })
  }, [])

  const handleTypeCreated = (t: RoomTypeRecord) => {
    setRoomTypes(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
    setValue('room_type_id', t.id, { shouldValidate: true, shouldDirty: true })
    setTypeModalOpen(false)
  }

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (images.length + files.length > 12) { toast.error('Maximum 12 photos allowed'); e.target.value = ''; return }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => setValue('images', [...(watch('images') ?? []), reader.result as string], { shouldDirty: true })
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx: number) => setValue('images', images.filter((_, i) => i !== idx), { shouldDirty: true })

  const onSubmit = async (data: RoomForm) => {
    if (!tenantId) return
    const supabase = createClient()
    const { error } = await supabase.from('rooms').insert({
      ...data,
      hotel_id: tenantId,
      notes: data.notes || null,
      rate_per_hour: data.rate_per_hour === '' || data.rate_per_hour == null ? null : data.rate_per_hour,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Room added successfully')
    router.push('/hotel-admin/rooms')
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Room</h2>
            <p className="text-sm text-gray-400 mt-0.5">Fill in the details to create a new room</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/hotel-admin/rooms" className="btn-secondary text-sm">Cancel</Link>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Adding…' : 'Add Room'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

          {/* ── Left: main sections ───────────────────────────────── */}
          <div className="space-y-5">

            {/* Section 1: Room Identity */}
            <SectionCard num={1} title="Room Details" accent="border-l-indigo-500">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Room Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                    <input
                      {...register('room_number')}
                      inputMode="numeric"
                      maxLength={6}
                      onInput={e => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/\D/g, '') }}
                      className="input pl-9"
                      placeholder="101"
                    />
                  </div>
                  {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number.message}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Floor</label>
                    <Link href="/hotel-admin/rooms/floors" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                      <Layers className="h-3 w-3" /> Manage
                    </Link>
                  </div>
                  {floors.length > 0 ? (
                    <select {...register('floor')} className="input">
                      {floors.map(f => (
                        <option key={f.id} value={f.floor_number}>{f.name} (Floor {f.floor_number})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="input flex items-center justify-between text-gray-400 text-sm bg-gray-50 cursor-default">
                      <span>No floors yet</span>
                      <Link href="/hotel-admin/rooms/floors" className="text-primary-600 font-medium hover:underline text-xs">Add →</Link>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Display Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className="input" placeholder="e.g. Ocean View Suite, Corner Deluxe" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
            </SectionCard>

            {/* Section 2: Type & Pricing */}
            <SectionCard num={2} title="Type & Pricing" accent="border-l-violet-500">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Room Type <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setTypeModalOpen(true)}
                      disabled={!tenantId}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> New type
                    </button>
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                    <select {...register('room_type_id')} className="input pl-9">
                      <option value="">Select type…</option>
                      {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
                  {tenantId && roomTypes.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">No types yet — create one above.</p>
                  )}
                </div>
                <div>
                  <label className="label">Price / Night <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">$</span>
                    <input
                      {...register('price_per_night')}
                      type="number" min={1} step="0.01"
                      className="input pl-7"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="label">Price / Hour <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">$</span>
                    <input
                      {...register('rate_per_hour')}
                      type="number" min={1} step="0.01"
                      className="input pl-7"
                      placeholder="Leave blank if this room isn't let by the hour"
                    />
                  </div>
                  {errors.rate_per_hour && <p className="text-red-500 text-xs mt-1">{errors.rate_per_hour.message}</p>}
                  <p className="text-xs text-gray-400 mt-1.5">
                    Set this to offer the room for short stays — hourly bookings are priced from it.
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Section 3: Photos */}
            <SectionCard num={3} title="Room Photos" accent="border-l-pink-500">
              {images.length === 0 ? (
                <label className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                    <Camera className="h-6 w-6 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-600 group-hover:text-primary-700 transition-colors">Upload room photos</p>
                    <p className="text-xs text-gray-400 mt-0.5">The first photo will be used as the cover image</p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 group-hover:border-primary-300 group-hover:text-primary-700 transition-colors">
                    Browse files
                  </span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                </label>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                    {images.length < 12 && (
                      <label className="aspect-video flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-all group">
                        <ImagePlus className="h-5 w-5 text-gray-300 group-hover:text-primary-400 transition-colors" />
                        <span className="text-[10px] text-gray-400 group-hover:text-primary-500 font-medium transition-colors">Add more</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{images.length} / 12 photos added</p>
                </>
              )}
            </SectionCard>
          </div>

          {/* ── Right: sticky sidebar ─────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Initial Status</h4>
              <div className="space-y-2">
                {STATUS_OPTIONS.map(opt => {
                  const Icon    = opt.icon
                  const checked = status === opt.value
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? `${opt.bg} ${opt.border} ring-2 ${opt.ring}`
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('status')}
                        value={opt.value}
                        className="sr-only"
                      />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${checked ? opt.bg : 'bg-gray-100'}`}>
                        <Icon className={`h-3.5 w-3.5 ${checked ? opt.color : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-sm font-medium ${checked ? opt.color : 'text-gray-600'}`}>{opt.label}</span>
                      {checked && <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${opt.color}`}>●</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Capacity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Capacity</h4>
              <p className="text-xs text-gray-400 mb-4">Auto-filled from room type, adjustable</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Max Adults</span>
                  </div>
                  <Stepper
                    value={maxAdults}
                    onChange={v => setValue('max_adults', v, { shouldDirty: true })}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Max Children</span>
                  </div>
                  <Stepper
                    value={maxChildren}
                    onChange={v => setValue('max_children', v, { shouldDirty: true })}
                    min={0}
                    max={20}
                  />
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total capacity</span>
                  <span className="text-sm font-bold text-gray-900">{maxAdults + maxChildren} guests</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Internal Notes <span className="text-gray-400 font-normal">(optional)</span>
              </h4>
              <textarea
                {...register('notes')}
                rows={4}
                className="input resize-none text-sm"
                placeholder="Any internal notes about this room…"
              />
            </div>

          </div>
        </div>
      </form>

      {tenantId && (
        <RoomTypeModal
          hotelId={tenantId}
          open={typeModalOpen}
          onClose={() => setTypeModalOpen(false)}
          onSaved={handleTypeCreated}
        />
      )}
    </div>
  )
}
