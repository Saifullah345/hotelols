import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canMoveTo, subscriptionIsLive, subscriptionIsTrialing } from '@/lib/plan-tier'
import { priceForCheckout, trialDaysOf } from '@/lib/paddle-plans'

/**
 * Approves a plan purchase and hands back the Paddle price to check out with.
 *
 * The billing page can't be trusted to enforce the rules on its own — the
 * buttons are just buttons. So the price id never comes from the browser: the
 * server decides whether the move is allowed and only then says which price to
 * open.
 *
 * This is the *first* purchase only. A hotel that already has a live
 * subscription changes plan through /api/paddle/change-plan, which moves the
 * existing subscription instead of starting a second one — opening a checkout
 * there would bill twice and hand out a fresh trial.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (profile?.role !== 'hotel_admin' || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const hotelId = profile.tenant_id

  const body = await request.json().catch(() => ({}))
  const planId = typeof body.planId === 'string' ? body.planId : null
  const cycle  = body.cycle === 'yearly' ? 'yearly' : 'monthly'
  if (!planId) return NextResponse.json({ error: 'A plan must be chosen' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: hotel } = await admin
    .from('hotels')
    .select('id, plan_id, subscription_status, plan_expires_at, trial_ends_at, trial_used_at, paddle_subscription_id')
    .eq('id', hotelId)
    .single()
  if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })

  // `*` so the guard still works on a database without migration 032 — the
  // ranking helper falls back to price when tier_rank is absent.
  const { data: target } = await admin
    .from('plans').select('*').eq('id', planId).maybeSingle()
  if (!target || !target.is_active) {
    return NextResponse.json({ error: 'That plan is not available' }, { status: 404 })
  }

  const { data: current } = hotel.plan_id
    ? await admin.from('plans').select('*').eq('id', hotel.plan_id).maybeSingle()
    : { data: null }

  const live     = subscriptionIsLive(hotel.subscription_status, hotel.plan_expires_at)
  const trialing = subscriptionIsTrialing(hotel.subscription_status, hotel.trial_ends_at)

  // Already subscribed: this is a plan change, not a purchase.
  if (live && hotel.paddle_subscription_id) {
    return NextResponse.json({
      error: 'You already have a running subscription — change the plan instead of buying a second one.',
      code: 'use_change_plan',
    }, { status: 409 })
  }

  const check = canMoveTo(current, target, { live, trialing })
  if (!check.allowed) {
    // 409, not 403: the request is legitimate, it just conflicts with the plan
    // the hotel is already on.
    return NextResponse.json({ error: check.reason, direction: check.direction }, { status: 409 })
  }

  // One free trial per hotel. A hotel that has had one checks out on the
  // trial-free twin of the price, so cancelling and re-subscribing can't
  // restart the clock.
  const trialEligible = trialDaysOf(target) > 0 && !hotel.trial_used_at

  const { priceId, trialDays, error } = await priceForCheckout(target, cycle, {
    trialEligible,
    save: async patch => { await admin.from('plans').update(patch).eq('id', target.id) },
  })

  if (!priceId) {
    return NextResponse.json(
      {
        error: error
          ? `The ${target.name} plan could not be prepared for checkout: ${error}`
          : `The ${target.name} plan has no ${cycle} price set up yet. Please contact support.`,
      },
      { status: 503 },
    )
  }

  return NextResponse.json({
    priceId,
    planId: target.id,
    planName: target.name,
    cycle,
    direction: check.direction,
    /** Days of free trial this checkout will actually grant. 0 = charged now. */
    trialDays,
  })
}
