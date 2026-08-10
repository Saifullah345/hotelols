import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { paddleConfigured, apiKeyProblem, getPaddlePrice, setPaddlePriceTrial } from '@/lib/paddle'

/**
 * Reports what Paddle actually has configured, so a billing problem can be
 * diagnosed from the app instead of guessed at from a dashboard screenshot.
 *
 * Answers, concretely: is the server configured, does each plan have prices,
 * do those prices exist, what do they cost, and do any of them carry a free
 * trial (which is what makes a first charge come out as 0.00).
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const env = {
    environment:   process.env.NEXT_PUBLIC_PADDLE_ENV ?? '(not set — defaults to sandbox)',
    apiKey:        Boolean(process.env.PADDLE_API_KEY),
    webhookSecret: Boolean(process.env.PADDLE_WEBHOOK_SECRET),
    clientToken:   Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN),
    // Where Paddle must be told to send notifications.
    webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/webhooks/paddle`,
  }

  const admin = await createAdminClient()
  const problems: string[] = []

  // Catches a key that is present but wrong — the wrong kind of token, an id
  // instead of the secret, or a sandbox key aimed at the production API.
  const keyProblem = apiKeyProblem()
  if (keyProblem) problems.push(keyProblem)

  if (!env.webhookSecret) problems.push('PADDLE_WEBHOOK_SECRET is not set — every incoming webhook is rejected with 401.')
  if (!env.clientToken)   problems.push('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set — checkout will not open.')
  if (!process.env.NEXT_PUBLIC_PADDLE_ENV) {
    problems.push('NEXT_PUBLIC_PADDLE_ENV is not set — the server defaults to the PRODUCTION Paddle API, so sandbox keys and prices will not work.')
  }

  const { data: plans } = await admin
    .from('plans')
    .select('id, name, price_monthly, price_yearly, is_active, paddle_product_id, paddle_price_id_monthly, paddle_price_id_yearly')
    .order('price_monthly')

  const planReport = []
  for (const plan of plans ?? []) {
    const cycles: Record<string, unknown> = {}

    for (const [cycle, priceId] of [
      ['monthly', plan.paddle_price_id_monthly],
      ['yearly',  plan.paddle_price_id_yearly],
    ] as const) {
      if (!priceId) {
        cycles[cycle] = { configured: false }
        if (plan.is_active) {
          problems.push(`Plan "${plan.name}" has no ${cycle} price in Paddle — it shows "Contact Sales" instead of a Subscribe button.`)
        }
        continue
      }

      if (!paddleConfigured()) {
        cycles[cycle] = { configured: true, priceId, checked: false }
        continue
      }

      const { data: price, error } = await getPaddlePrice(priceId)
      if (error || !price) {
        cycles[cycle] = { configured: true, priceId, exists: false, error }
        problems.push(`Plan "${plan.name}" ${cycle} price ${priceId} could not be read from Paddle: ${error ?? 'not found'}. Wrong environment, or the price was deleted.`)
        continue
      }

      const amount = price.unit_price ? Number(price.unit_price.amount) / 100 : null
      const trial  = price.trial_period ?? null

      cycles[cycle] = {
        configured: true,
        priceId,
        exists: true,
        status: price.status,
        amount,
        currency: price.unit_price?.currency_code,
        billingCycle: price.billing_cycle,
        trial,
      }

      // This is what makes a first payment come through as 0.00.
      if (trial) {
        problems.push(
          `Plan "${plan.name}" ${cycle} price has a free trial of ${trial.frequency} ${trial.interval}(s). ` +
          `Paddle charges 0.00 up front and bills only when the trial ends. Remove the trial in Paddle, or POST here with {"removeTrialFrom":"${priceId}"}.`,
        )
      }
      if (price.status !== 'active') {
        problems.push(`Plan "${plan.name}" ${cycle} price is ${price.status} in Paddle — checkout will fail.`)
      }
      const expected = cycle === 'monthly' ? Number(plan.price_monthly) : Number(plan.price_yearly)
      if (amount !== null && Math.abs(amount - expected) > 0.005) {
        problems.push(`Plan "${plan.name}" ${cycle} costs ${amount} in Paddle but ${expected} here. Re-save the plan to republish it.`)
      }
    }

    planReport.push({
      name: plan.name,
      active: plan.is_active,
      productId: plan.paddle_product_id,
      ...cycles,
    })
  }

  // What the hotel's subscription currently looks like on our side.
  let hotel = null
  if (profile.tenant_id) {
    const { data } = await admin
      .from('hotels')
      .select('name, plan_id, subscription_status, plan_expires_at, billing_cycle, paddle_subscription_id, paddle_customer_id')
      .eq('id', profile.tenant_id).single()
    hotel = data
    if (data && !data.paddle_subscription_id) {
      problems.push('This hotel has no Paddle subscription recorded. If a payment has gone through, no webhook reached this server — use "Sync from Paddle" on the billing page to apply it now.')
    }
  }

  return NextResponse.json({ env, plans: planReport, hotel, problems })
}

/** Removes a free trial from a price, so the next checkout charges in full. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only the platform owner can change prices' }, { status: 403 })
  }
  if (!paddleConfigured()) {
    return NextResponse.json({ error: 'PADDLE_API_KEY is not set on this server' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const priceId = typeof body.removeTrialFrom === 'string' ? body.removeTrialFrom : null
  if (!priceId) return NextResponse.json({ error: 'removeTrialFrom is required' }, { status: 400 })

  const { data, error } = await setPaddlePriceTrial(priceId, null)
  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json({ success: true, priceId, trial: data?.trial_period ?? null })
}
