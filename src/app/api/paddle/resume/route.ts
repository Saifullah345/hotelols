import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { getPaddleSubscription, paddleConfigured, resumePaddleSubscription } from '@/lib/paddle'
import { applySubscription } from '@/lib/paddle-sync'

/**
 * Removes the scheduled cancellation from a subscription that is still running.
 *
 * When a hotel cancels "at period end" — during a trial or on a paid plan —
 * Paddle keeps the subscription in its current state (`trialing` / `active`) and
 * adds a `scheduled_change` that will stop it on the end date. Clearing that
 * change is what "keep my plan" means, and it is also the *only* correct way to
 * re-subscribe before the end date: buying again would leave the queued
 * cancellation in place and start a second, overlapping subscription.
 *
 * Paddle is asked what is actually scheduled rather than the stored status being
 * trusted, so a record that drifted (a missed webhook, a cancellation made in
 * Paddle's own dashboard) still resolves to the right answer.
 */
export async function POST() {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    return NextResponse.json(
      { error: 'No subscription found. Choose a plan to start one.', code: 'needs_checkout' },
      { status: 404 },
    )
  }

  const existing = await getPaddleSubscription(hotel.paddle_subscription_id)
  if (!existing) {
    return NextResponse.json(
      { error: 'That subscription no longer exists in Paddle. Choose a plan to start a new one.', code: 'needs_checkout' },
      { status: 404 },
    )
  }

  // Already over: there is nothing left to un-cancel, and only a new checkout
  // can help. The billing page turns this into the "choose a plan" path.
  if (existing.status === 'canceled') {
    return NextResponse.json(
      { error: 'This subscription has already ended. Choose a plan to start a new one.', code: 'needs_checkout' },
      { status: 409 },
    )
  }

  // Nothing queued: the subscription is simply running. Re-store it so a record
  // that had drifted catches up, and report success — the hotel asked to keep
  // their plan and they have it.
  if (existing.scheduled_change?.action !== 'cancel') {
    const synced = await applySubscription(
      admin,
      existing as unknown as Record<string, unknown>,
      { hotelId: profile.tenant_id },
    )
    return NextResponse.json({
      success: true,
      planName: synced.planName,
      alreadyRunning: true,
    })
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
