'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// An empty number input reads as NaN; that means "not filled in", not "invalid".
const count = (noun: string) =>
  z.preprocess(
    v => (typeof v === 'number' && Number.isNaN(v) ? undefined : v),
    z.number({ invalid_type_error: `Enter a number of ${noun}` })
      .int(`${noun} must be a whole number`)
      .min(1, `Must be at least 1 — tick Unlimited for no limit`)
      .optional(),
  )

const planSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9 '\-]+$/, 'Only letters, numbers, spaces, hyphens, and apostrophes are allowed'),
  // Unlimited is a checkbox, not a magic -1 typed into the box. Typing a
  // negative limit was possible before, and a plan saved with one (-20 rooms)
  // let no rooms be added at all.
  max_rooms: count('rooms'),
  unlimited_rooms: z.boolean().default(false),
  max_staff: count('staff'),
  unlimited_staff: z.boolean().default(false),
  price_monthly: z.number().positive('Must be a positive number'),
  price_yearly: z.number().positive('Must be a positive number'),
  // Blank means "rank by price", which an empty number input gives as NaN.
  tier_rank: z.preprocess(
    v => (typeof v === 'number' && Number.isNaN(v) ? undefined : v),
    z.number().int('Tier rank must be a whole number').min(1, 'Must be 1 or higher').optional(),
  ),
  // 0 is a real answer here ("charge at checkout"), so an empty box means 0
  // rather than "not filled in".
  trial_days: z.preprocess(
    v => (typeof v === 'number' && Number.isNaN(v) ? 0 : v),
    z.number().int('Trial days must be a whole number')
      .min(0, 'Cannot be negative - use 0 for no trial')
      .max(365, 'Cannot exceed 365 days')
      .default(0),
  ),
  features: z.string().transform(v => v.split('\n').filter(f => f.trim())),
  is_active: z.boolean().default(true),
  feature_listing:          z.boolean().default(true),
  feature_housekeeping:     z.boolean().default(true),
  feature_reviews:          z.boolean().default(true),
  feature_online_booking:   z.boolean().default(true),
  feature_advanced_reports: z.boolean().default(true),
  feature_api_access:       z.boolean().default(false),
  feature_multi_property:   z.boolean().default(false),
}).superRefine((v, ctx) => {
  // A limit is required unless the plan is explicitly unlimited.
  if (!v.unlimited_rooms && v.max_rooms === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_rooms'], message: 'Enter a room limit, or tick Unlimited' })
  }
  if (!v.unlimited_staff && v.max_staff === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_staff'], message: 'Enter a staff limit, or tick Unlimited' })
  }
})

/** What the API stores: -1 for unlimited, otherwise the number entered. */
function limitValue(unlimited: boolean, entered?: number): number {
  return unlimited ? -1 : (entered as number)
}

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      is_active: true,
      trial_days: 0,
      unlimited_rooms: false,
      unlimited_staff: false,
      feature_listing:          true,
      feature_housekeeping:     true,
      feature_reviews:          true,
      feature_online_booking:   true,
      feature_advanced_reports: true,
      feature_api_access:       false,
      feature_multi_property:   false,
    },
  })

  const unlimitedRooms = watch('unlimited_rooms')
  const unlimitedStaff = watch('unlimited_staff')

  // Saved through the API rather than straight to the database: the same
  // request publishes the plan to Paddle as a product with a monthly and a
  // yearly price, and stores the ids the checkout needs.
  const onSubmit = async (data: PlanForm) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          max_rooms: limitValue(data.unlimited_rooms, data.max_rooms),
          max_staff: limitValue(data.unlimited_staff, data.max_staff),
        }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json.error ?? 'Failed to create plan')
        return
      }

      // Only claim it reached Paddle when it actually did — a plan with no
      // price can't be bought, and the billing page shows "Contact Sales".
      if (json.warning) {
        toast.success('Plan created')
        toast.warning(json.warning, { duration: 8000 })
      } else {
        toast.success('Plan created and published to Paddle')
      }
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
            <label className="label">Max Rooms</label>
            <input
              type="number"
              min={1}
              step={1}
              {...register('max_rooms', { valueAsNumber: true, disabled: unlimitedRooms })}
              className="input disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={unlimitedRooms ? 'Unlimited' : '10'}
            />
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('unlimited_rooms')} className="rounded" />
              <span className="text-sm text-gray-600">Unlimited rooms</span>
            </label>
            {errors.max_rooms && <p className="text-red-600 text-sm mt-1">{errors.max_rooms.message}</p>}
          </div>

          <div>
            <label className="label">Max Staff</label>
            <input
              type="number"
              min={1}
              step={1}
              {...register('max_staff', { valueAsNumber: true, disabled: unlimitedStaff })}
              className="input disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={unlimitedStaff ? 'Unlimited' : '5'}
            />
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('unlimited_staff')} className="rounded" />
              <span className="text-sm text-gray-600">Unlimited staff</span>
            </label>
            {errors.max_staff && <p className="text-red-600 text-sm mt-1">{errors.max_staff.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monthly Price ($)</label>
            <input
              type="number"
              min={0.01}
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
              min={0.01}
              step="0.01"
              {...register('price_yearly', { valueAsNumber: true })}
              className="input"
              placeholder="990"
            />
            {errors.price_yearly && <p className="text-red-600 text-sm mt-1">{errors.price_yearly.message}</p>}
          </div>
        </div>

        {/* Upgrade ladder */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <label className="label">Tier Rank (optional)</label>
          <input
            type="number"
            min={1}
            step={1}
            {...register('tier_rank', { valueAsNumber: true })}
            className="input max-w-[200px]"
            placeholder="Defaults to the monthly price"
          />
          <p className="mt-2 text-xs text-amber-700">
            Position on the upgrade ladder — higher is a better plan. Hotels may only move to a
            plan ranked above their current one. Leave empty to rank by monthly price.
            Starter 10 · Hotel Management 20 · Growth 30 · Pro 40 · Enterprise 50.
          </p>
          {errors.tier_rank && <p className="text-red-600 text-sm mt-1">{errors.tier_rank.message}</p>}
        </div>

        {/* Free trial */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <label className="label">Free Trial (days)</label>
          <input
            type="number"
            min={0}
            max={365}
            step={1}
            {...register('trial_days', { valueAsNumber: true })}
            className="input max-w-[200px]"
            placeholder="0"
          />
          <p className="mt-2 text-xs text-indigo-700">
            How long a hotel uses this plan before paying anything. Paddle takes 0.00 at checkout
            and charges in full the day the trial ends — 0 charges straight away. A hotel gets one
            trial ever: changing plan mid-trial keeps the same end date, and it cannot be restarted
            by cancelling and signing up again.
          </p>
          {errors.trial_days && <p className="text-red-600 text-sm mt-1">{errors.trial_days.message}</p>}
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
