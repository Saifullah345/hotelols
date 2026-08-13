import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canMoveTo, subscriptionIsLive } from '@/lib/plan-tier'

/**
 * Approves a plan change and hands back the Paddle price to check out with.
 *
 * The billing page can't be trusted to enforce the upgrade-only rule on its
 * own — the buttons are just buttons. So the price id never comes from the
 * browser: the server decides whether the move is allowed and only then says
 * which price to open. A hotel on a live subscription can move up the ladder
 * and nowhere else.
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
    .select('id, plan_id, subscription_status, plan_expires_at')
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

  const live = subscriptionIsLive(hotel.subscription_status, hotel.plan_expires_at)
  const check = canMoveTo(current, target, { live })
  if (!check.allowed) {
    // 409, not 403: the request is legitimate, it just conflicts with the plan
    // the hotel is already on.
    return NextResponse.json({ error: check.reason, direction: check.direction }, { status: 409 })
  }

  const priceId = cycle === 'yearly' ? target.paddle_price_id_yearly : target.paddle_price_id_monthly
  if (!priceId) {
    return NextResponse.json(
      { error: `The ${target.name} plan has no ${cycle} price set up yet. Please contact support.` },
      { status: 503 },
    )
  }

  return NextResponse.json({
    priceId,
    planId: target.id,
    planName: target.name,
    cycle,
    direction: check.direction,
  })
}
