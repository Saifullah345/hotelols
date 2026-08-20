import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import BillingClient from './BillingClient'
import { redirect } from 'next/navigation'
import { planRank } from '@/lib/plan-tier'

export const metadata = { title: 'Billing & Subscription' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { user, tenantId: hotelId } = await getAuthContext()
  if (!user) redirect('/login')
  if (!hotelId) redirect('/select-role')

  const admin = await createAdminClient()

  // Three serial reads became one wave. The hotel's own plan arrives embedded on
  // the hotel row rather than as a follow-up lookup keyed by hotel.plan_id, and
  // the plan ladder doesn't depend on the hotel at all, so it goes out at the
  // same time.
  //
  // `*` rather than a column list so the page still renders on a database where
  // migration 032 hasn't been applied yet — the trial columns simply come back
  // undefined and the page reads as "no trial".
  const [{ data: hotelRow }, { data: plans }] = await Promise.all([
    admin
      .from('hotels')
      .select('*, plan:plans(*)')
      .eq('id', hotelId)
      .single(),
    admin
      .from('plans')
      .select('*')
      .eq('is_active', true),
  ])

  // Split the embed back off so BillingClient receives the shape it always has:
  // the hotel row, and the current plan as its own prop.
  type PlanRow = NonNullable<typeof plans>[number]
  const currentPlan = ((hotelRow as { plan?: PlanRow | null } | null)?.plan ?? null) as PlanRow | null
  const hotel = hotelRow

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
