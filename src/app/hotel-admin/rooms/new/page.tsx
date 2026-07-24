'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Trash2, ImagePlus, X } from 'lucide-react'
import Link from 'next/link'
import { currencySymbol } from '@/lib/currency'

const DEFAULT_AMENITIES = [
  'WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony',
  'Jacuzzi', 'Kitchen', 'Butler Service', 'Pool', 'Parking', 'Breakfast', 'Gym', 'Spa',
]

const schema = z.object({
  room_number: z.string().min(1, 'Room number required'),
  name: z.string().optional(),
  floor: z.coerce.number().min(0),
  price_per_night: z.coerce.number().min(1, 'Price required'),
  room_type_id: z.string().uuid('Select a room type'),
  max_adults: z.coerce.number().min(1, 'At least 1 adult'),
  max_children: z.coerce.number().min(0),
  status: z.enum(['available', 'booked', 'maintenance', 'cleaning']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type RoomTypeOption = { id: string; name: string; max_adults: number; max_children: number; amenities: string[] }

const newTypeSchema = z.object({
  name: z.string().min(1, 'Type name required'),
})
type NewTypeData = z.infer<typeof newTypeSchema>

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([])
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({})
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [showNewType, setShowNewType] = useState(false)
  const [showManageTypes, setShowManageTypes] = useState(false)
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null)
  const [roomAmenities, setRoomAmenities] = useState<string[]>([])
  const [customAmenity, setCustomAmenity] = useState('')
  const [roomImages, setRoomImages] = useState<string[]>([])
  const [uploadingRoomImage, setUploadingRoomImage] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'available', floor: 1, max_adults: 2, max_children: 0 },
  })

  const {
    register: registerType,
    handleSubmit: handleSubmitType,
    reset: resetType,
    setError: setTypeError,
    formState: { errors: typeErrors, isSubmitting: isSubmittingType },
  } = useForm<NewTypeData>({
    resolver: zodResolver(newTypeSchema),
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id)
        const [{ data }, { data: rooms }, { data: hotel }] = await Promise.all([
          supabase.from('room_types').select('id, name, max_adults, max_children, amenities').eq('hotel_id', profile.tenant_id),
          supabase.from('rooms').select('room_type_id').eq('hotel_id', profile.tenant_id),
          supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
        ])
        if (data) setRoomTypes(data)
        if (rooms) {
          const counts: Record<string, number> = {}
          for (const r of rooms) counts[r.room_type_id] = (counts[r.room_type_id] ?? 0) + 1
          setRoomCounts(counts)
        }
        if ((hotel as { currency?: string } | null)?.currency) {
          setCurrency((hotel as { currency: string }).currency)
        }
      }
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return
    const supabase = createClient()
    const { error } = await supabase.from('rooms').insert({
      ...data,
      hotel_id: tenantId,
      amenities: roomAmenities,
      images: roomImages,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Room added successfully')
    router.push('/hotel-admin/rooms')
  }

  const onCreateType = async (data: NewTypeData) => {
    if (!tenantId) return
    const trimmedName = data.name.trim()
    const isDuplicate = roomTypes.some(t => t.name.trim().toLowerCase() === trimmedName.toLowerCase())
    if (isDuplicate) {
      setTypeError('name', { message: 'A room type with this name already exists' })
      return
    }
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('room_types')
      .insert({ hotel_id: tenantId, name: trimmedName })
      .select('id, name, max_adults, max_children, amenities')
      .single()
    if (error) {
      if (error.code === '23505') {
        setTypeError('name', { message: 'A room type with this name already exists' })
      } else {
        toast.error(error.message)
      }
      return
    }
    setRoomTypes(prev => [...prev, created])
    setValue('room_type_id', created.id)
    setShowNewType(false)
    resetType({ name: '' })
    toast.success('Room type added')
  }

  const toggleAmenity = (amenity: string) => {
    setRoomAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity],
    )
  }

  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim()
    if (!trimmed) return
    if (!roomAmenities.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      setRoomAmenities(prev => [...prev, trimmed])
    }
    setCustomAmenity('')
  }

  const handleRoomImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadingRoomImage(true)
    const reader = new FileReader()
    reader.onload = () => {
      setRoomImages(prev => [...prev, reader.result as string])
      setUploadingRoomImage(false)
    }
    reader.onerror = () => setUploadingRoomImage(false)
    reader.readAsDataURL(file)
  }

  const removeRoomImage = (index: number) => {
    setRoomImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteType = async (id: string, name: string) => {
    if (!confirm(`Delete room type "${name}"? This can't be undone.`)) return
    setDeletingTypeId(id)
    const supabase = createClient()
    const { error } = await supabase.from('room_types').delete().eq('id', id)
    setDeletingTypeId(null)
    if (error) {
      toast.error(
        error.code === '23503'
          ? `Can't delete "${name}" — one or more rooms still use this type.`
          : error.message,
      )
      return
    }
    setRoomTypes(prev => prev.filter(t => t.id !== id))
    if (watch('room_type_id') === id) setValue('room_type_id', '')
    toast.success(`"${name}" deleted`)
  }

  const selectedRoomTypeId = watch('room_type_id')
  const selectedType = roomTypes.find(t => t.id === selectedRoomTypeId)

  // Prefill this room's occupancy and amenities from its type's defaults;
  // admin can still override below for a specific room (e.g. one with an
  // extra cot, or missing an amenity the rest of the type has).
  useEffect(() => {
    if (selectedType) {
      setValue('max_adults', selectedType.max_adults)
      setValue('max_children', selectedType.max_children)
      setRoomAmenities(selectedType.amenities ?? [])
    }
  }, [selectedType, setValue])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Add New Room</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Room Number</label>
            <input {...register('room_number')} className="input" placeholder="101" />
            {errors.room_number && <p className="text-red-500 text-xs mt-1">{errors.room_number.message}</p>}
          </div>
          <div>
            <label className="label">Floor</label>
            <input {...register('floor')} type="number" className="input" />
            {errors.floor && <p className="text-red-500 text-xs mt-1">{errors.floor.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Room Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <input {...register('name')} className="input" placeholder="e.g. Ocean View" />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="label">Room Type</label>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowManageTypes(v => !v)}
                className="text-xs font-medium text-gray-500 hover:underline"
              >
                {showManageTypes ? 'Done' : 'Manage types'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewType(v => !v)
                  resetType({ name: '' })
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showNewType ? 'Cancel' : '+ Add new room type'}
              </button>
            </div>
          </div>
          <select {...register('room_type_id')} className="input">
            <option value="">Select type</option>
            {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}

          {showManageTypes && (
            <div className="mt-3 space-y-1 rounded-lg border border-gray-200 p-2">
              {roomTypes.length === 0 && (
                <p className="text-xs text-gray-400 px-2 py-1">No room types yet.</p>
              )}
              {roomTypes.map(t => {
                const inUseCount = roomCounts[t.id] ?? 0
                return (
                  <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{t.name}</span>
                    {inUseCount > 0 ? (
                      <span
                        className="text-xs text-gray-400"
                        title={`Used by ${inUseCount} room${inUseCount !== 1 ? 's' : ''} — reassign or delete those rooms first to remove this type`}
                      >
                        {inUseCount} room{inUseCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteType(t.id, t.name)}
                        disabled={deletingTypeId === t.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        title={`Delete ${t.name}`}
                      >
                        {deletingTypeId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {/* {selectedType && (
            <p className="text-xs text-gray-500 mt-1">
              Type default: {selectedType.max_adults} adult{selectedType.max_adults !== 1 ? 's' : ''}
              {selectedType.max_children > 0 && `, ${selectedType.max_children} child${selectedType.max_children !== 1 ? 'ren' : ''}`}
            </p>
          )} */}

          {showNewType && (
            <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-3">
              <div>
                <label className="label">Type Name</label>
                <input {...registerType('name')} className="input" placeholder="e.g. Family Suite" />
                {typeErrors.name && <p className="text-red-500 text-xs mt-1">{typeErrors.name.message}</p>}
              </div>
              <button
                type="button"
                onClick={handleSubmitType(onCreateType)}
                disabled={isSubmittingType}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {isSubmittingType && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Room Type
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Adults</label>
              <input {...register('max_adults')} type="number" min={1} className="input" />
              {errors.max_adults && <p className="text-red-500 text-xs mt-1">{errors.max_adults.message}</p>}
            </div>
            <div>
              <label className="label">Max Children</label>
              <input {...register('max_children')} type="number" min={0} className="input" />
              {errors.max_children && <p className="text-red-500 text-xs mt-1">{errors.max_children.message}</p>}
            </div>
          </div>
          {/* <p className="text-xs text-gray-400 mt-1">Prefilled from the room type — override if this specific room sleeps more or fewer guests.</p> */}
        </div>

        <div>
          <label className="label">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_AMENITIES.map(amenity => {
              const active = roomAmenities.includes(amenity)
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary-50 border-primary-400 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {amenity}
                </button>
              )
            })}
            {roomAmenities.filter(a => !DEFAULT_AMENITIES.includes(a)).map(amenity => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary-50 border-primary-400 text-primary-700 flex items-center gap-1"
              >
                {amenity} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={customAmenity}
              onChange={e => setCustomAmenity(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity() } }}
              className="input text-sm"
              placeholder="Add a custom amenity..."
            />
            <button type="button" onClick={addCustomAmenity} className="btn-secondary text-sm shrink-0">
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="label">Photos</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {roomImages.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Room photo ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeRoomImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 text-gray-500 hover:text-red-600"
                  title="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <label className="btn-secondary text-sm inline-flex items-center gap-2 cursor-pointer">
            <ImagePlus className="h-4 w-4" />
            {uploadingRoomImage ? 'Uploading...' : 'Add photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleRoomImageUpload} />
          </label>
        </div>

        <div>
          <label className="label">Price per Night ({currencySymbol(currency).trim()})</label>
          <input {...register('price_per_night')} type="number" className="input" placeholder="150" />
          {errors.price_per_night && <p className="text-red-500 text-xs mt-1">{errors.price_per_night.message}</p>}
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
          <label className="label">Notes (optional)</label>
          <textarea {...register('notes')} className="input resize-none h-20" placeholder="Any notes about this room..." />
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
