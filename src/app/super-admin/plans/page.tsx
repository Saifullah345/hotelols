import { createClient } from '@/lib/supabase/server'
import { Check, Zap, Edit2, Plus } from 'lucide-react'
import Link from 'next/link'
import SyncPlanButton from './SyncPlanButton'
import { planRank } from '@/lib/plan-tier'

export const metadata = { title: 'Subscription Plans' }

// The Paddle state shown here changes as plans are synced.
export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Unauthorized</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return <div>Unauthorized</div>
  }

  const { data: plans } = await supabase.from('plans').select('*')
  // Shown in ladder order, which is the order hotels can move through them —
  // by price, custom-priced Enterprise would sit at the front.
  const ordered = [...(plans ?? [])].sort((a, b) => planRank(a) - planRank(b))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
          <p className="text-gray-500 text-sm mt-1">Manage platform pricing tiers</p>
        </div>
        <Link href="/super-admin/plans/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New Plan
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ordered.map(plan => (
          <div key={plan.id} className={`card p-6 relative ${plan.name === 'growth' ? 'border-primary-400 ring-2 ring-primary-100' : ''}`}>
            {plan.name === 'growth' && (
              <div className="flex items-center gap-1 mb-3">
                <Zap className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-semibold text-primary-600 uppercase">Most Popular</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-gray-900 capitalize">{plan.name}</h3>
              <span
                className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500"
                title="Position on the upgrade ladder — hotels can only move to a higher rank"
              >
                Rank {planRank(plan)}
              </span>
            </div>
            <div className="mt-2 mb-6">
              {plan.name === 'enterprise' ? (
                <span className="text-3xl font-bold text-gray-900">Custom</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-gray-900">${plan.price_monthly}</span>
                  <span className="text-gray-500">/month</span>
                </>
              )}
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500" />
                {plan.max_rooms === -1 ? 'Unlimited rooms' : `Up to ${plan.max_rooms} rooms`}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500" />
                {plan.max_staff === -1 ? 'Unlimited staff' : `Up to ${plan.max_staff} staff`}
              </div>
              {(plan.features as string[]).map((f: string) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-green-500" /> {f}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <p>Yearly: <strong className="text-gray-900">${plan.price_yearly}/yr</strong></p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(0)}/yr
                  </p>
                </div>
                {plan.is_active ? (
                  <span className="badge-green text-xs">Active</span>
                ) : (
                  <span className="badge-gray text-xs">Inactive</span>
                )}
              </div>
              {/* A plan with no Paddle price can't be bought — the billing page
                  falls back to "Contact Sales" for it. */}
              {!plan.paddle_price_id_monthly && !plan.paddle_price_id_yearly && (
                <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                  Not on Paddle yet — hotels can&apos;t subscribe to this plan.
                </p>
              )}
              <div className="space-y-2">
                <Link
                  href={`/super-admin/plans/${plan.id}`}
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-sm w-full py-2"
                >
                  <Edit2 className="h-4 w-4" /> Edit
                </Link>
                <SyncPlanButton
                  planId={plan.id}
                  planName={plan.name}
                  published={Boolean(plan.paddle_price_id_monthly || plan.paddle_price_id_yearly)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
