import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { canMoveTo, subscriptionIsLive, subscriptionIsTrialing } from '@/lib/plan-tier'
import { paddleConfigured, getPaddleSubscription, updatePaddleSubscription } from '@/lib/paddle'
import { applySubscription, announcePlanChange } from '@/lib/paddle-sync'

/**
 * Moves a hotel that already has a subscription onto a different plan.
 *
 * The existing Paddle subscription is edited rather than a new one bought, and
 * that is the whole point: during a trial the swap is made with
 * `do_not_bill`, so Paddle leaves the billing period alone. The trial keeps
 * running to the day it was always going to end — pick a different plan on day
 * 4 of 14 and there are still 10 days left, on the new plan, charged then.
 *
 * After the trial the ordinary rule applies: upgrades only, prorated and
 * charged straight away.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile?.role !== 'hotel_admin' || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const hotelId = profile.tenant_id

  if (!paddleConfigured()) {
    return NextResponse.json(
      { error: 'Paddle is not configured on the server (PADDLE_API_KEY is missing).' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const planId = typeof body.planId === 'string' ? body.planId : null
  // Absent means "keep the cycle they are on" — changing plan shouldn't quietly
  // move someone from yearly to monthly.
  const requestedCycle = body.cycle === 'yearly' ? 'yearly' : body.cycle === 'monthly' ? 'monthly' : null
  if (!planId) return NextResponse.json({ error: 'A plan must be chosen' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: hotel } = await admin
    .from('hotels')
    .select('id, plan_id, subscription_status, plan_expires_at, trial_ends_at, billing_cycle, paddle_subscription_id')
    .eq('id', hotelId)
    .single()
  if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })

  if (!hotel.paddle_subscription_id) {
    return NextResponse.json(
      { error: 'No subscription to change yet. Choose a plan to subscribe first.', code: 'no_subscription' },
      { status: 409 },
    )
  }

  const live = subscriptionIsLive(hotel.subscription_status, hotel.plan_expires_at)
  if (!live) {
    return NextResponse.json(
      { error: 'Your subscription is no longer running. Choose a plan to start a new one.', code: 'no_subscription' },
      { status: 409 },
    )
  }

  const trialing = subscriptionIsTrialing(hotel.subscription_status, hotel.trial_ends_at)
  const cycle = requestedCycle ?? (hotel.billing_cycle === 'yearly' ? 'yearly' : 'monthly')

  const { data: target } = await admin.from('plans').select('*').eq('id', planId).maybeSingle()
  if (!target || !target.is_active) {
    return NextResponse.json({ error: 'That plan is not available' }, { status: 404 })
  }

  const { data: current } = hotel.plan_id
    ? await admin.from('plans').select('*').eq('id', hotel.plan_id).maybeSingle()
    : { data: null }

  // Same plan, different billing cycle, is a real request — let it through.
  const cycleOnly = target.id === hotel.plan_id && requestedCycle !== null && requestedCycle !== hotel.billing_cycle
  if (!cycleOnly) {
    const check = canMoveTo(current, target, { live, trialing })
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason, direction: check.direction }, { status: 409 })
    }
  }

  // The price with the trial on it, always: Paddle only starts a trial when a
  // subscription is created, so swapping onto a trial price mid-subscription
  // costs nothing and grants nothing.
  const priceId = cycle === 'yearly' ? target.paddle_price_id_yearly : target.paddle_price_id_monthly
  if (!priceId) {
    return NextResponse.json(
      { error: `The ${target.name} plan has no ${cycle} price set up yet. Please contact support.` },
      { status: 503 },
    )
  }

  // Trial: swap the item and touch nothing else, so the trial end date — and
  // therefore the day of the first charge — stays exactly where it was.
  // Otherwise: charge the difference now, the way an upgrade should behave.
  const { error: paddleError } = await updatePaddleSubscription(hotel.paddle_subscription_id, priceId, {
    prorationBillingMode: trialing ? 'do_not_bill' : 'prorated_immediately',
  })
  if (paddleError) {
    return NextResponse.json({ error: `Paddle refused the change: ${paddleError}` }, { status: 502 })
  }

  // Read the subscription back rather than trusting the PATCH response shape,
  // then store it through the same path the webhook uses. `applySubscription`
  // keeps the existing trial_ends_at, so even a Paddle payload that reported a
  // fresh trial window could not extend this hotel's trial.
  const updated = await getPaddleSubscription(hotel.paddle_subscription_id)
  if (!updated) {
    return NextResponse.json({
      success: true,
      planName: target.name,
      warning: 'The plan was changed in Paddle but could not be read back. Press "Sync from Paddle" if the page still shows the old plan.',
    })
  }

  const result = await applySubscription(admin, updated as unknown as Record<string, unknown>, { hotelId })
  if (!result.applied) {
    return NextResponse.json(
      { error: result.reason ?? 'The plan changed in Paddle but could not be saved here.' },
      { status: 500 },
    )
  }

  await announcePlanChange(admin, result)

  return NextResponse.json({
    success: true,
    planId: result.planId,
    planName: result.planName,
    previousPlanName: result.previousPlanName,
    direction: result.direction,
    cycle,
    trialing,
    trialEndsAt: result.trialEndsAt,
    expiresAt: result.expiresAt,
    // What the hotel should be told happened to their money.
    charged: !trialing,
    message: trialing
      ? `You're on ${target.name} now. Your trial still ends ${
          result.trialEndsAt ? new Date(result.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'as before'
        } — nothing has been charged.`
      : `You're on ${target.name} now. The difference has been charged to your card.`,
  })
}
