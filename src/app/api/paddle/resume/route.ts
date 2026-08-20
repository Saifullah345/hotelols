import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { paddleConfigured, resumePaddleSubscription } from '@/lib/paddle'
import { applySubscription } from '@/lib/paddle-sync'

/**
 * Removes the scheduled cancellation from a trialing subscription.
 *
 * When a hotel cancels during a free trial (scheduling the end "at period end"),
 * Paddle keeps the subscription status as "trialing" but adds a scheduled_change
 * that will stop it at the trial end date. Calling this clears that change so
 * the card is charged automatically when the trial ends — i.e. the hotel keeps
 * their subscription.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (profile?.role !== 'hotel_admin' || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!paddleConfigured()) {
    return NextResponse.json(
      { error: 'Paddle is not configured on the server.' },
      { status: 503 },
    )
  }

  const admin = await createAdminClient()
  const { data: hotel } = await admin
    .from('hotels')
    .select('paddle_subscription_id, subscription_status')
    .eq('id', profile.tenant_id)
    .single()

  if (!hotel?.paddle_subscription_id) {
    return NextResponse.json({ error: 'No subscription found.' }, { status: 404 })
  }

  if (hotel.subscription_status !== 'trialing') {
    return NextResponse.json(
      { error: 'Subscription is not in a trialing state. Start a new checkout instead.' },
      { status: 409 },
    )
  }

  const { data, error } = await resumePaddleSubscription(hotel.paddle_subscription_id)
  if (error || !data) {
    return NextResponse.json(
      { error: error ?? 'Paddle did not return the updated subscription.' },
      { status: 502 },
    )
  }

  const result = await applySubscription(
    admin,
    data as unknown as Record<string, unknown>,
    { hotelId: profile.tenant_id },
  )

  if (!result.applied) {
    return NextResponse.json(
      { error: result.reason ?? 'Could not update the subscription record.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, planName: result.planName })
}
