'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const planSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9 '\-]+$/, 'Only letters, numbers, spaces, hyphens, and apostrophes are allowed'),
  max_rooms: z.number().int().min(-1, 'Must be -1 (unlimited) or positive'),
  max_staff: z.number().int().min(-1, 'Must be -1 (unlimited) or positive'),
  price_monthly: z.number().positive('Must be a positive number'),
  price_yearly: z.number().positive('Must be a positive number'),
  features: z.string().transform(v => v.split('\n').filter(f => f.trim())),
  is_active: z.boolean().default(true),
  feature_listing:          z.boolean().default(true),
  feature_housekeeping:     z.boolean().default(true),
  feature_reviews:          z.boolean().default(true),
  feature_online_booking:   z.boolean().default(true),
  feature_advanced_reports: z.boolean().default(true),
  feature_api_access:       z.boolean().default(false),
  feature_multi_property:   z.boolean().default(false),
})

const CUSTOMER_FLAGS = [
  { field: 'feature_listing'        as const, label: 'Listed on Website',   desc: 'Hotel appears on the public search & listing page — customers can find it' },
  { field: 'feature_online_booking' as const, label: 'Online Booking',      desc: 'Customers can book rooms directly online through the hotel page' },
]

const INTERNAL_FLAGS = [
  { field: 'feature_housekeeping'     as const, label: 'Housekeeping',       desc: 'Task management & room cleaning tracking' },
  { field: 'feature_reviews'          as const, label: 'Reviews',            desc: 'Guest feedback & review management' },
  { field: 'feature_advanced_reports' as const, label: 'Advanced Reports',   desc: 'Detailed analytics & data exports' },
  { field: 'feature_api_access'       as const, label: 'API Access',         desc: 'REST API for third-party integrations' },
  { field: 'feature_multi_property'   as const, label: 'Multi-property',     desc: 'Manage multiple hotel properties under one account' },
]

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
      feature_listing:          true,
      feature_housekeeping:     true,
      feature_reviews:          true,
      feature_online_booking:   true,
      feature_advanced_reports: true,
      feature_api_access:       false,
      feature_multi_property:   false,
    },
  })

  // Saved through the API rather than straight to the database: the same
  // request publishes the plan to Paddle as a product with a monthly and a
  // yearly price, and stores the ids the checkout needs.
  const onSubmit = async (data: PlanForm) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create plan')
        return
      }

      toast.success('Plan created and published to Paddle')
      // Paddle refused or isn't configured — the plan saved, but it can't be
      // sold until it's re-synced, so say so rather than failing silently.
      if (json.warning) toast.warning(json.warning)
      router.push('/super-admin/plans')
      router.refresh()
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

        <div className="space-y-4">
          <label className="label">Module Permissions</label>

          {/* Customer visibility */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Customer Visibility</p>
            <p className="text-xs text-blue-600">Controls whether customers can find and book this hotel online.</p>
            {CUSTOMER_FLAGS.map(({ field, label, desc }) => (
              <label key={field} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register(field)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</span>
                  <span className="block text-xs text-gray-500">{desc}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Internal modules */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Management Modules</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTERNAL_FLAGS.map(({ field, label, desc }) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register(field)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
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
