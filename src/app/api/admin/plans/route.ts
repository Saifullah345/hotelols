import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createPlanInPaddle } from '@/lib/paddle-plans'

/** Only the platform owner manages the plan catalogue. */
async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { admin: await createAdminClient() }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error
  const { admin } = auth

  const body = await request.json().catch(() => ({}))
  const name          = typeof body.name === 'string' ? body.name.trim() : ''
  const priceMonthly  = Number(body.price_monthly)
  const priceYearly   = Number(body.price_yearly)

  if (!name) return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
  if (!Number.isFinite(priceMonthly) || priceMonthly <= 0) {
    return NextResponse.json({ error: 'Monthly price must be greater than 0' }, { status: 400 })
  }
  if (!Number.isFinite(priceYearly) || priceYearly <= 0) {
    return NextResponse.json({ error: 'Yearly price must be greater than 0' }, { status: 400 })
  }

  // Published to Paddle first: if the catalogue entry can't be made we still
  // want the plan saved, but with the ids we did get rather than none.
  const sync = await createPlanInPaddle({
    name,
    price_monthly: priceMonthly,
    price_yearly: priceYearly,
    description: typeof body.description === 'string' ? body.description : null,
  })

  const { data: plan, error } = await admin.from('plans').insert({
    name,
    max_rooms:     Number(body.max_rooms ?? -1),
    max_staff:     Number(body.max_staff ?? -1),
    price_monthly: priceMonthly,
    price_yearly:  priceYearly,
    features:      Array.isArray(body.features) ? body.features : [],
    is_active:     body.is_active !== false,
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
