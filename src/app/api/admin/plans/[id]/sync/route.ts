import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  paddleConfigured, createPaddleProduct, createPaddlePrice,
  archivePaddlePrice, getPaddlePrice, setPaddlePriceTrial,
} from '@/lib/paddle'
import { PLAN_CURRENCY } from '@/lib/paddle-plans'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Brings one plan's Paddle catalogue entry into line with what's stored here.
 *
 * Repairs the three things that actually go wrong: a plan that was never
 * published (no product or prices), a price whose amount has drifted from the
 * plan, and a free trial that makes the first charge come out as 0.00.
 *
 * Paddle price amounts are immutable, so a drifted price is replaced and the
 * old one archived — existing subscribers keep the price they signed up on.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!paddleConfigured()) {
    return NextResponse.json({ error: 'PADDLE_API_KEY is not set on this server' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  // Default on: a trial is almost never what's wanted on a repair.
  const removeTrials = body.removeTrials !== false

  const admin = await createAdminClient()
  const { data: plan } = await admin
    .from('plans')
    .select('id, name, price_monthly, price_yearly, paddle_product_id, paddle_price_id_monthly, paddle_price_id_yearly')
    .eq('id', id)
    .single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const changes: string[] = []
  const problems: string[] = []
  const updates: Record<string, string | null> = {}

  // ── The product ───────────────────────────────────────────────────
  let productId = plan.paddle_product_id
  if (!productId) {
    const created = await createPaddleProduct(plan.name)
    if (created.error || !created.data) {
      return NextResponse.json({ error: `Could not create the Paddle product: ${created.error}` }, { status: 400 })
    }
    productId = created.data.id
    updates.paddle_product_id = productId
    changes.push(`created Paddle product for "${plan.name}"`)
  }

  // ── Each billing cycle ────────────────────────────────────────────
  const cycles = [
    { key: 'paddle_price_id_monthly' as const, priceId: plan.paddle_price_id_monthly, amount: Number(plan.price_monthly), interval: 'month' as const, label: 'monthly' },
    { key: 'paddle_price_id_yearly'  as const, priceId: plan.paddle_price_id_yearly,  amount: Number(plan.price_yearly),  interval: 'year'  as const, label: 'yearly'  },
  ]

  for (const cycle of cycles) {
    let needsNewPrice = !cycle.priceId
    let oldPriceId: string | null = cycle.priceId

    if (cycle.priceId) {
      const { data: price, error } = await getPaddlePrice(cycle.priceId)

      if (error || !price) {
        // The stored id points at nothing Paddle knows about — most often a
        // price from the other environment. Replace it.
        needsNewPrice = true
        oldPriceId = null
        problems.push(`${cycle.label} price could not be read from Paddle (${error ?? 'not found'}) — creating a new one`)
      } else {
        const paddleAmount = price.unit_price ? Number(price.unit_price.amount) / 100 : null

        if (paddleAmount !== null && Math.abs(paddleAmount - cycle.amount) > 0.005) {
          needsNewPrice = true
          changes.push(`${cycle.label} price ${paddleAmount} → ${cycle.amount}`)
        } else if (price.trial_period && removeTrials) {
          // Amount is right; only the trial has to go. Patching keeps the id,
          // so existing subscriptions are untouched.
          const cleared = await setPaddlePriceTrial(cycle.priceId, null)
          if (cleared.error) problems.push(`could not remove the ${cycle.label} trial: ${cleared.error}`)
          else changes.push(`removed the ${price.trial_period.frequency}-${price.trial_period.interval} trial from the ${cycle.label} price`)
        }

        if (price.status !== 'active' && !needsNewPrice) {
          needsNewPrice = true
          changes.push(`${cycle.label} price was ${price.status} — creating an active one`)
        }
      }
    }

    if (!needsNewPrice) continue

    const created = await createPaddlePrice({
      productId,
      amount: cycle.amount,
      currency: PLAN_CURRENCY,
      interval: cycle.interval,
      description: `${plan.name} — ${cycle.label}`,
    })
    if (created.error || !created.data) {
      problems.push(`could not create the ${cycle.label} price: ${created.error}`)
      continue
    }

    updates[cycle.key] = created.data.id
    if (!changes.some(c => c.startsWith(cycle.label))) {
      changes.push(`published the ${cycle.label} price`)
    }

    // Archive the replaced price only once its successor exists, so the plan is
    // never left with nothing to sell.
    if (oldPriceId) {
      const archived = await archivePaddlePrice(oldPriceId)
      if (archived.error) problems.push(`old ${cycle.label} price is still active: ${archived.error}`)
    }
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.from('plans').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    plan: plan.name,
    changes,
    problems,
    message: changes.length ? changes.join('; ') : 'Already in sync with Paddle',
  })
}
