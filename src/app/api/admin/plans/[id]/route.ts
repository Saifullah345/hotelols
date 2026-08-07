import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { updatePlanInPaddle, deactivatePlanInPaddle } from '@/lib/paddle-plans'

type Ctx = { params: Promise<{ id: string }> }

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

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error
  const { admin } = auth

  const { data: current } = await admin
    .from('plans')
    .select('id, name, price_monthly, price_yearly, is_active, paddle_product_id, paddle_price_id_monthly, paddle_price_id_yearly')
    .eq('id', id)
    .single()
  if (!current) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const name         = typeof body.name === 'string' ? body.name.trim() : current.name
  const priceMonthly = body.price_monthly !== undefined ? Number(body.price_monthly) : Number(current.price_monthly)
  const priceYearly  = body.price_yearly  !== undefined ? Number(body.price_yearly)  : Number(current.price_yearly)

  if (!name) return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
  if (name.length < 2) return NextResponse.json({ error: 'Plan name must be at least 2 characters' }, { status: 400 })
  if (name.length > 50) return NextResponse.json({ error: 'Plan name cannot exceed 50 characters' }, { status: 400 })
  if (!/^[a-zA-Z0-9 '\-]+$/.test(name)) {
    return NextResponse.json({ error: 'Plan name may only contain letters, numbers, spaces, hyphens, and apostrophes' }, { status: 400 })
  }
  if (!Number.isFinite(priceMonthly) || priceMonthly <= 0) {
    return NextResponse.json({ error: 'Monthly price must be greater than 0' }, { status: 400 })
  }
  if (!Number.isFinite(priceYearly) || priceYearly <= 0) {
    return NextResponse.json({ error: 'Yearly price must be greater than 0' }, { status: 400 })
  }

  const sync = await updatePlanInPaddle(
    {
      name: current.name,
      price_monthly: Number(current.price_monthly),
      price_yearly:  Number(current.price_yearly),
      paddle_product_id:       current.paddle_product_id,
      paddle_price_id_monthly: current.paddle_price_id_monthly,
      paddle_price_id_yearly:  current.paddle_price_id_yearly,
    },
    { name, price_monthly: priceMonthly, price_yearly: priceYearly },
  )

  const updates: Record<string, unknown> = {
    name,
    price_monthly: priceMonthly,
    price_yearly:  priceYearly,
    ...sync.ids,
  }

  for (const key of [
    'max_rooms', 'max_staff', 'features', 'is_active',
    'feature_listing', 'feature_housekeeping', 'feature_reviews',
    'feature_online_booking', 'feature_advanced_reports',
    'feature_api_access', 'feature_multi_property',
  ]) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // A plan switched off shouldn't stay on sale in Paddle.
  let archiveWarning: string | undefined
  if (body.is_active === false && current.is_active) {
    archiveWarning = await deactivatePlanInPaddle(current.paddle_product_id)
  }

  const { data: plan, error } = await admin.from('plans').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const warning = [sync.warning, archiveWarning].filter(Boolean).join(' ')
  return NextResponse.json({ plan, warning: warning || undefined })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error
  const { admin } = auth

  const { data: plan } = await admin
    .from('plans').select('id, paddle_product_id').eq('id', id).single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Hotels reference the plan, so it is retired rather than deleted — removing
  // it would orphan every hotel on it.
  const { count } = await admin
    .from('hotels').select('id', { count: 'exact', head: true }).eq('plan_id', id)

  const warning = await deactivatePlanInPaddle(plan.paddle_product_id)
  const { error } = await admin.from('plans').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    success: true,
    retired: true,
    hotelsOnPlan: count ?? 0,
    warning,
  })
}
