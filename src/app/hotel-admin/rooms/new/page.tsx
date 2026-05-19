'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  room_number: z.string().min(1, 'Room number required'),
  floor: z.coerce.number().min(0),
  price_per_night: z.coerce.number().min(1, 'Price required'),
  room_type_id: z.string().uuid('Select a room type'),
  status: z.enum(['available', 'booked', 'maintenance', 'cleaning']),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewRoomPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'available', floor: 1 },
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id)
        const { data } = await supabase.from('room_types').select('id, name').eq('hotel_id', profile.tenant_id)
        if (data) setRoomTypes(data)
      }
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!tenantId) return
    const supabase = createClient()
    const { error } = await supabase.from('rooms').insert({ ...data, hotel_id: tenantId })
    if (error) { toast.error(error.message); return }
    toast.success('Room added successfully')
    router.push('/hotel-admin/rooms')
  }

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
          <label className="label">Room Type</label>
          <select {...register('room_type_id')} className="input">
            <option value="">Select type</option>
            {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.room_type_id && <p className="text-red-500 text-xs mt-1">{errors.room_type_id.message}</p>}
        </div>

        <div>
          <label className="label">Price per Night ($)</label>
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
