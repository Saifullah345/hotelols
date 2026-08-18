import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  paddleConfigured, createPaddleProduct, createPaddlePrice,
  archivePaddlePrice, getPaddlePrice, setPaddlePriceTrial,
} from '@/lib/paddle'
import { PLAN_CURRENCY, trialDaysOf } from '@/lib/paddle-plans'

type Ctx = { params: Promise<{ id: string }> }

/** Paddle states a trial as a count of intervals; the plan states it in days. */
const PER_DAY: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 }

/**
 * Brings one plan's Paddle catalogue entry into line with what's stored here.
 *
 * Repairs the three things that actually go wrong: a plan that was never
 * published (no product or prices), a price whose amount has drifted from the
 * plan, and a trial in Paddle that isn't the one the plan promises — either an
 * unwanted one making the first charge 0.00, or a missing one on a plan sold as
 * "14 days free".
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
  // The plan's own trial_days is the target. `removeTrials` overrides it for a
  // one-off repair — a plan that should not be selling a free period at all.
  const forceRemove = body.removeTrials === true

  const admin = await createAdminClient()
  const { data: plan } = await admin
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const wantedTrialDays = forceRemove ? 0 : trialDaysOf(plan)
  const wantedTrial = wantedTrialDays > 0
    ? { interval: 'day' as const, frequency: wantedTrialDays }
    : null

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

        const trialInPaddle = price.trial_period
          ? price.trial_period.frequency * (PER_DAY[price.trial_period.interval] ?? 1)
          : 0

        if (paddleAmount !== null && Math.abs(paddleAmount - cycle.amount) > 0.005) {
          needsNewPrice = true
          changes.push(`${cycle.label} price ${paddleAmount} → ${cycle.amount}`)
        } else if (trialInPaddle !== wantedTrialDays) {
          // Amount is right; only the trial is off. Patching keeps the price id,
          // so existing subscriptions are untouched.
          const patched = await setPaddlePriceTrial(cycle.priceId, wantedTrial)
          if (patched.error) problems.push(`could not set the ${cycle.label} trial: ${patched.error}`)
          else changes.push(
            wantedTrialDays === 0
              ? `removed the ${trialInPaddle}-day trial from the ${cycle.label} price`
              : `${cycle.label} trial ${trialInPaddle} → ${wantedTrialDays} days`,
          )
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
      trialDays: wantedTrialDays,
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
