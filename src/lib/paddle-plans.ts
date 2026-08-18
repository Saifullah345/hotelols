// Keeps a plan in the database and its Paddle catalogue entry in step.
//
// One plan == one Paddle product with two prices (monthly and yearly). A
// Paddle price's amount cannot be edited, so changing what a plan costs means
// creating a replacement price and archiving the old one — the ids stored on
// the plan always point at whatever is currently sellable.
//
// A plan with `trial_days` carries the trial on its prices: Paddle takes 0.00
// at checkout, puts the subscription into `trialing`, and charges in full when
// the trial runs out. That is the whole mechanism — nothing here has to run a
// timer or watch a clock.

import {
  paddleConfigured,
  createPaddleProduct, updatePaddleProduct,
  createPaddlePrice, archivePaddlePrice,
  getPaddlePrice, setPaddlePriceTrial,
} from '@/lib/paddle'

export const PLAN_CURRENCY = process.env.PADDLE_CURRENCY ?? 'USD'

export type PlanCatalogueInput = {
  name: string
  price_monthly: number
  price_yearly: number
  description?: string | null
  /** Free days on both prices. 0 charges at checkout. */
  trial_days?: number
}

export type PlanCatalogueIds = {
  paddle_product_id: string | null
  paddle_price_id_monthly: string | null
  paddle_price_id_yearly: string | null
  /** Trial-free twins, used by hotels that have already had their free period. */
  paddle_price_id_monthly_no_trial?: string | null
  paddle_price_id_yearly_no_trial?: string | null
}

export type SyncResult = {
  ids: Partial<PlanCatalogueIds>
  /** Set when Paddle could not be reached or refused — the plan still saves. */
  warning?: string
}

const NOT_CONFIGURED: SyncResult = {
  ids: {},
  warning: 'Saved, but not published: PADDLE_API_KEY is not set on this server. ' +
           'Add it and press "Publish to Paddle" on the plan to make it buyable.',
}

/** Whole days of trial, clamped to something Paddle will accept. */
export function trialDaysOf(plan: { trial_days?: number | string | null } | null | undefined): number {
  const days = Math.round(Number(plan?.trial_days ?? 0))
  if (!Number.isFinite(days) || days <= 0) return 0
  return Math.min(days, 365)
}

/**
 * Creates the product and both prices for a brand-new plan.
 *
 * Never throws: a plan the super admin just typed out must still save even if
 * Paddle is unreachable or unconfigured. The caller surfaces `warning` and the
 * plan can be re-synced later.
 */
export async function createPlanInPaddle(plan: PlanCatalogueInput): Promise<SyncResult> {
  if (!paddleConfigured()) return NOT_CONFIGURED

  const product = await createPaddleProduct(plan.name, plan.description ?? undefined)
  if (product.error || !product.data) {
    return { ids: {}, warning: `Saved, but Paddle rejected the product: ${product.error ?? 'unknown error'}` }
  }

  const productId = product.data.id
  const trialDays = trialDaysOf(plan)

  const [monthly, yearly] = await Promise.all([
    createPaddlePrice({
      productId, amount: plan.price_monthly, currency: PLAN_CURRENCY,
      interval: 'month', description: `${plan.name} — monthly`, trialDays,
    }),
    createPaddlePrice({
      productId, amount: plan.price_yearly, currency: PLAN_CURRENCY,
      interval: 'year', description: `${plan.name} — yearly`, trialDays,
    }),
  ])

  const failed = [monthly.error, yearly.error].filter(Boolean)
  return {
    ids: {
      paddle_product_id: productId,
      paddle_price_id_monthly: monthly.data?.id ?? null,
      paddle_price_id_yearly:  yearly.data?.id  ?? null,
    },
    warning: failed.length
      ? `Saved, but Paddle rejected a price: ${failed.join('; ')}`
      : undefined,
  }
}

/**
 * Brings an existing plan's Paddle entry back in line after an edit.
 *
 * - No product yet (plan predates billing) → creates the whole thing.
 * - Renamed → renames the product.
 * - Price changed → new price created, old one archived.
 * - Trial length changed → patched onto the existing price, which keeps the id
 *   and so leaves every current subscriber alone.
 */
export async function updatePlanInPaddle(
  current: PlanCatalogueIds & {
    name: string; price_monthly: number; price_yearly: number; trial_days?: number | null
  },
  next: PlanCatalogueInput,
): Promise<SyncResult> {
  if (!paddleConfigured()) return NOT_CONFIGURED

  // Nothing in Paddle yet: treat the edit as a first publish.
  if (!current.paddle_product_id) {
    return createPlanInPaddle(next)
  }

  const warnings: string[] = []
  const ids: Partial<PlanCatalogueIds> = {}

  if (next.name !== current.name) {
    const renamed = await updatePaddleProduct(current.paddle_product_id, { name: next.name })
    if (renamed.error) warnings.push(`rename failed: ${renamed.error}`)
  }

  const trialDays     = trialDaysOf(next)
  const trialChanged  = trialDays !== trialDaysOf(current)

  const cycles = [
    {
      changed: Number(next.price_monthly) !== Number(current.price_monthly),
      existing: current.paddle_price_id_monthly,
      staleTwin: 'paddle_price_id_monthly_no_trial' as const,
      twin: current.paddle_price_id_monthly_no_trial ?? null,
      amount: next.price_monthly,
      interval: 'month' as const,
      key: 'paddle_price_id_monthly' as const,
      label: 'monthly',
    },
    {
      changed: Number(next.price_yearly) !== Number(current.price_yearly),
      existing: current.paddle_price_id_yearly,
      staleTwin: 'paddle_price_id_yearly_no_trial' as const,
      twin: current.paddle_price_id_yearly_no_trial ?? null,
      amount: next.price_yearly,
      interval: 'year' as const,
      key: 'paddle_price_id_yearly' as const,
      label: 'yearly',
    },
  ]

  for (const cycle of cycles) {
    // A missing price is created even when the amount didn't change, so a
    // half-published plan repairs itself on the next save.
    if (!cycle.changed && cycle.existing) {
      // Only the trial moved: patch it in place rather than replacing the
      // price, so nobody's subscription is disturbed.
      if (trialChanged) {
        const patched = await setPaddlePriceTrial(
          cycle.existing,
          trialDays > 0 ? { interval: 'day', frequency: trialDays } : null,
        )
        if (patched.error) warnings.push(`${cycle.label} trial not updated: ${patched.error}`)
      }
      continue
    }

    const created = await createPaddlePrice({
      productId: current.paddle_product_id,
      amount: cycle.amount,
      currency: PLAN_CURRENCY,
      interval: cycle.interval,
      description: `${next.name} — ${cycle.label}`,
      trialDays,
    })
    if (created.error || !created.data) {
      warnings.push(`${cycle.label} price failed: ${created.error ?? 'unknown error'}`)
      continue
    }

    ids[cycle.key] = created.data.id
    // Archive only after the replacement exists, so a failure never leaves the
    // plan with nothing to sell. Existing subscribers keep their own price.
    if (cycle.existing) {
      const archived = await archivePaddlePrice(cycle.existing)
      if (archived.error) warnings.push(`old ${cycle.label} price left active: ${archived.error}`)
    }

    // The trial-free twin was a copy of the old amount and would now sell the
    // plan at yesterday's price. Drop it; it is rebuilt on demand.
    if (cycle.twin) {
      await archivePaddlePrice(cycle.twin)
      ids[cycle.staleTwin] = null
    }
  }

  return {
    ids,
    warning: warnings.length ? `Saved, but Paddle reported: ${warnings.join('; ')}` : undefined,
  }
}

/** Archives the product so it can no longer be bought. */
export async function deactivatePlanInPaddle(productId: string | null): Promise<string | undefined> {
  if (!productId || !paddleConfigured()) return undefined
  const res = await updatePaddleProduct(productId, { status: 'archived' })
  return res.error ? `Plan saved, but Paddle could not archive it: ${res.error}` : undefined
}

export type PlanPriceRow = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  trial_days?: number | null
  paddle_product_id: string | null
  paddle_price_id_monthly: string | null
  paddle_price_id_yearly: string | null
  paddle_price_id_monthly_no_trial?: string | null
  paddle_price_id_yearly_no_trial?: string | null
}

/**
 * The price a given hotel should check out on.
 *
 * A hotel that has already had its free period must not get another one by
 * cancelling and signing up again, and a Paddle trial lives on the price — so
 * a second, trial-free price is created for the plan the first time one is
 * needed and remembered on the plan from then on.
 *
 * `save` writes the new id back; it is passed in rather than imported so this
 * stays usable from anywhere holding an admin client.
 */
export async function priceForCheckout(
  plan: PlanPriceRow,
  cycle: 'monthly' | 'yearly',
  opts: { trialEligible: boolean; save: (patch: Record<string, string>) => Promise<void> },
): Promise<{ priceId: string | null; trialDays: number; error?: string }> {
  const trialDays = trialDaysOf(plan)
  const withTrial  = cycle === 'monthly' ? plan.paddle_price_id_monthly : plan.paddle_price_id_yearly

  // No trial on this plan, or the hotel is entitled to one: the ordinary price.
  if (trialDays === 0 || opts.trialEligible) {
    return { priceId: withTrial ?? null, trialDays: opts.trialEligible ? trialDays : 0 }
  }

  const twinKey = cycle === 'monthly'
    ? 'paddle_price_id_monthly_no_trial'
    : 'paddle_price_id_yearly_no_trial'
  const existingTwin = plan[twinKey] ?? null
  if (existingTwin) return { priceId: existingTwin, trialDays: 0 }

  if (!plan.paddle_product_id || !paddleConfigured()) {
    // Nothing better to offer: fall back to the normal price rather than
    // blocking the sale. Worst case the hotel gets a second trial.
    return { priceId: withTrial ?? null, trialDays: 0 }
  }

  const created = await createPaddlePrice({
    productId: plan.paddle_product_id,
    amount: cycle === 'monthly' ? Number(plan.price_monthly) : Number(plan.price_yearly),
    currency: PLAN_CURRENCY,
    interval: cycle === 'monthly' ? 'month' : 'year',
    description: `${plan.name} — ${cycle} (no trial)`,
  })
  if (created.error || !created.data) {
    return { priceId: withTrial ?? null, trialDays: 0, error: created.error }
  }

  await opts.save({ [twinKey]: created.data.id })
  return { priceId: created.data.id, trialDays: 0 }
}

/** What Paddle has on a price, for the diagnostics report. */
export async function readPriceTrial(priceId: string) {
  const { data, error } = await getPaddlePrice(priceId)
  if (error || !data) return { days: null as number | null, error }
  const trial = data.trial_period
  if (!trial) return { days: 0 }
  const perDay: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 }
  return { days: trial.frequency * (perDay[trial.interval] ?? 1) }
}
