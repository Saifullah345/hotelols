import { createClient } from '@/lib/supabase/server'
import { Check, Zap, Edit2, Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Subscription Plans' }

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

  const { data: plans } = await supabase.from('plans').select('*').order('price_monthly')

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
        {plans?.map(plan => (
          <div key={plan.id} className={`card p-6 relative ${plan.name === 'pro' ? 'border-primary-400 ring-2 ring-primary-100' : ''}`}>
            {plan.name === 'pro' && (
              <div className="flex items-center gap-1 mb-3">
                <Zap className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-semibold text-primary-600 uppercase">Most Popular</span>
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 capitalize">{plan.name}</h3>
            <div className="mt-2 mb-6">
              <span className="text-3xl font-bold text-gray-900">${plan.price_monthly}</span>
              <span className="text-gray-500">/month</span>
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
              <Link
                href={`/super-admin/plans/${plan.id}`}
                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm w-full py-2"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
