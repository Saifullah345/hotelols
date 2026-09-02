import { NextResponse } from 'next/server'
import { createPlanInPaddle } from '@/lib/paddle-plans'
import { requireSuperAdmin } from '@/lib/api-auth'

import { parsePlanLimit, parseTierRank, parseTrialDays } from '@/lib/plan-limits'

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error
  const { admin } = auth

  const body = await request.json().catch(() => ({}))
  const name          = typeof body.name === 'string' ? body.name.trim() : ''
  const priceMonthly  = Number(body.price_monthly)
  const priceYearly   = Number(body.price_yearly)

  if (!name) return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
  if (name.length < 2) return NextResponse.json({ error: 'Plan name must be at least 2 characters' }, { status: 400 })
  if (name.length > 30) return NextResponse.json({ error: 'Plan name cannot exceed 30 characters' }, { status: 400 })
  if (!/^[a-zA-Z0-9 '\-]+$/.test(name)) {
    return NextResponse.json({ error: 'Plan name may only contain letters, numbers, spaces, hyphensand apostrophes' }, { status: 400 })
  }
  if (!Number.isFinite(priceMonthly) || priceMonthly <= 0) {
    return NextResponse.json({ error: 'Monthly price must be greater than 0' }, { status: 400 })
  }
  if (!Number.isFinite(priceYearly) || priceYearly <= 0) {
    return NextResponse.json({ error: 'Yearly price must be greater than 0' }, { status: 400 })
  }

  // Limits are checked here too, not just in the form: a plan saved with a
  // negative limit other than -1 bars the hotel from adding any rooms at all.
  const rooms = parsePlanLimit(body.max_rooms ?? -1, 'Max rooms')
  if ('error' in rooms) return NextResponse.json({ error: rooms.error }, { status: 400 })
  const staff = parsePlanLimit(body.max_staff ?? -1, 'Max staff')
  if ('error' in staff) return NextResponse.json({ error: staff.error }, { status: 400 })

  const rank = parseTierRank(body.tier_rank, Math.max(Math.round(priceMonthly), 1))
  if ('error' in rank) return NextResponse.json({ error: rank.error }, { status: 400 })

  // The trial goes onto the Paddle prices, so it has to be settled before the
  // catalogue entry is created.
  const trial = parseTrialDays(body.trial_days)
  if ('error' in trial) return NextResponse.json({ error: trial.error }, { status: 400 })

  // Published to Paddle first: if the catalogue entry can't be made we still
  // want the plan saved, but with the ids we did get rather than none.
  const sync = await createPlanInPaddle({
    name,
    price_monthly: priceMonthly,
    price_yearly: priceYearly,
    description: typeof body.description === 'string' ? body.description : null,
    trial_days: trial.value,
  })

  const { data: plan, error } = await admin.from('plans').insert({
    name,
    max_rooms:     rooms.value,
    max_staff:     staff.value,
    price_monthly: priceMonthly,
    price_yearly:  priceYearly,
    features:      Array.isArray(body.features) ? body.features : [],
    is_active:     body.is_active !== false,
    // Position on the upgrade ladder. Left to the monthly price when unset,
    // which is the right order for an ordinary tier; a custom-priced one needs
    // its rank stated, or it lands at the bottom.
    tier_rank:     rank.value,
    // Free days before the first charge. Paddle enforces it; this is the record
    // of what was asked forand what the pricing page advertises.
    trial_days:    trial.value,
    feature_listing:          body.feature_listing          !== false,
    feature_housekeeping:     body.feature_housekeeping     !== false,
    feature_reviews:          body.feature_reviews          !== false,
    feature_online_booking:   body.feature_online_booking   !== false,
    feature_advanced_reports: body.feature_advanced_reports !== false,
    feature_api_access:       body.feature_api_access       === true,
    feature_multi_property:   body.feature_multi_property   === true,
    ...sync.ids,
  }).select().single()

  if (error) {
    // The plan didn't save, so nothing should be left behind in Paddle either.
    // Archiving is best-effort; a stray archived product is harmless.
    if (sync.ids.paddle_product_id) {
      const { deactivatePlanInPaddle } = await import('@/lib/paddle-plans')
      await deactivatePlanInPaddle(sync.ids.paddle_product_id)
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ plan, warning: sync.warning }, { status: 201 })
}
