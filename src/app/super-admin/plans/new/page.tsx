'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  max_rooms: z.number().int().min(-1, 'Must be -1 (unlimited) or positive'),
  max_staff: z.number().int().min(-1, 'Must be -1 (unlimited) or positive'),
  price_monthly: z.number().positive('Must be a positive number'),
  price_yearly: z.number().positive('Must be a positive number'),
  features: z.string().transform(v => v.split('\n').filter(f => f.trim())),
  is_active: z.boolean().default(true),
})

type PlanForm = z.infer<typeof planSchema>

export default function NewPlanPage() {
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      is_active: true,
    },
  })

  const onSubmit = async (data: PlanForm) => {
    try {
      const { error } = await supabase
        .from('plans')
        .insert({
          name: data.name,
          max_rooms: data.max_rooms,
          max_staff: data.max_staff,
          price_monthly: data.price_monthly,
          price_yearly: data.price_yearly,
          features: data.features,
          is_active: data.is_active,
        })

      if (error) throw error

      toast.success('Plan created successfully')
      router.push('/super-admin/plans')
    } catch (error) {
      console.error('Failed to create plan:', error)
      toast.error('Failed to create plan')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Create New Plan</h2>
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Plan Name</label>
            <input
              type="text"
              {...register('name')}
              className="input"
              placeholder="e.g., Starter, Professional"
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Is Active</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('is_active')} className="rounded" defaultChecked />
              <span className="text-sm text-gray-600">Active for new signups</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Max Rooms (-1 for unlimited)</label>
            <input
              type="number"
              {...register('max_rooms', { valueAsNumber: true })}
              className="input"
              placeholder="10"
            />
            {errors.max_rooms && <p className="text-red-600 text-sm mt-1">{errors.max_rooms.message}</p>}
          </div>

          <div>
            <label className="label">Max Staff (-1 for unlimited)</label>
            <input
              type="number"
              {...register('max_staff', { valueAsNumber: true })}
              className="input"
              placeholder="5"
            />
            {errors.max_staff && <p className="text-red-600 text-sm mt-1">{errors.max_staff.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly Price ($)</label>
            <input
              type="number"
              step="0.01"
              {...register('price_monthly', { valueAsNumber: true })}
              className="input"
              placeholder="99"
            />
            {errors.price_monthly && <p className="text-red-600 text-sm mt-1">{errors.price_monthly.message}</p>}
          </div>

          <div>
            <label className="label">Yearly Price ($)</label>
            <input
              type="number"
              step="0.01"
              {...register('price_yearly', { valueAsNumber: true })}
              className="input"
              placeholder="990"
            />
            {errors.price_yearly && <p className="text-red-600 text-sm mt-1">{errors.price_yearly.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Features (one per line)</label>
          <textarea
            {...register('features')}
            className="input"
            rows={4}
            placeholder="Priority support&#10;Custom reports&#10;API access"
          />
          {errors.features && <p className="text-red-600 text-sm mt-1">{errors.features.message}</p>}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Create Plan
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
