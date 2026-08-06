import { createClient, createAdminClient } from '@/lib/supabase/server'
import BillingClient from './BillingClient'
import { redirect } from 'next/navigation'

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

  const { data: hotel } = await admin
    .from('hotels')
    .select('id, name, plan_id, subscription_status, paddle_subscription_id, plan_activated_at')
    .eq('id', hotelId)
    .single()

  const { data: plans } = await admin
    .from('plans')
    .select('id, name, price_monthly, price_yearly, features, paddle_price_id_monthly, paddle_price_id_yearly')
    .eq('is_active', true)
    .order('price_monthly')

  const { data: currentPlan } = hotel?.plan_id
    ? await admin.from('plans').select('*').eq('id', hotel.plan_id).single()
    : { data: null }

  return (
    <BillingClient
      hotel={hotel}
      currentPlan={currentPlan}
      plans={plans ?? []}
    />
  )
}
