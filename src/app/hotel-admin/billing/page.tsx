import { createClient, createAdminClient } from '@/lib/supabase/server'
import BillingClient from './BillingClient'
import { redirect } from 'next/navigation'
import { planRank } from '@/lib/plan-tier'

export const metadata = { title: 'Billing & Subscription' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()

  const hotelId = profile?.tenant_id
  if (!hotelId) redirect('/select-role')

  const admin = await createAdminClient()

  // `*` rather than a column list so the page still renders on a database where
  // migration 032 hasn't been applied yet — the trial columns simply come back
  // undefined and the page reads as "no trial".
  const { data: hotel } = await admin
    .from('hotels')
    .select('*')
    .eq('id', hotelId)
    .single()

  const { data: plans } = await admin
    .from('plans')
    .select('*')
    .eq('is_active', true)

  const { data: currentPlan } = hotel?.plan_id
    ? await admin.from('plans').select('*').eq('id', hotel.plan_id).single()
    : { data: null }

  // Cheapest first would put Enterprise at the front — it carries a 0.01
  // placeholder because it is custom-priced. The ladder is the honest order.
  const ordered = [...(plans ?? [])].sort((a, b) => planRank(a) - planRank(b))

  return (
    <BillingClient
      hotel={hotel}
      currentPlan={currentPlan}
      plans={ordered}
    />
  )
}
