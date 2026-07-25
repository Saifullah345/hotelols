'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Tag, X, Plus } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Type name is required'),
})
type FormData = z.infer<typeof schema>

export type CreatedRoomType = {
  id: string
  name: string
  max_adults: number
  max_children: number
}

export default function RoomTypeModal({
  hotelId,
  open,
  onClose,
  onCreated,
}: {
  hotelId: string
  open: boolean
  onClose: () => void
  onCreated: (type: CreatedRoomType) => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const close = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    // Occupancy/description/amenities fall back to the table defaults — they can
    // still be overridden per room on the Add Room form.
    const { data: created, error } = await supabase
      .from('room_types')
      .insert({ hotel_id: hotelId, name: data.name.trim() })
      .select('id, name, max_adults, max_children')
      .single()

    if (error) {
      // Unique index on (hotel_id, lower(name)) — surface a friendly message
      toast.error(
        error.code === '23505'
          ? `A room type named "${data.name.trim()}" already exists`
          : error.message
      )
      return
    }

    toast.success(`Room type "${created.name}" created`)
    onCreated(created as CreatedRoomType)
    reset()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={close}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Tag className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">New Room Type</h3>
            <p className="text-xs text-gray-500">Available to every room in your hotel</p>
          </div>
        </div>

        <div>
          <label className="label">Type Name <span className="text-red-500">*</span></label>
          <input
            {...register('name')}
            className="input"
            placeholder="e.g. Family Room, Executive Suite"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(onSubmit)() } }}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={close} disabled={isSubmitting} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn-primary flex-1 gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isSubmitting ? 'Creating…' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  )
}
