// Keeps a plan in the database and its Paddle catalogue entry in step.
//
// One plan == one Paddle product with two prices (monthly and yearly). A
// Paddle price's amount cannot be edited, so changing what a plan costs means
// creating a replacement price and archiving the old one — the ids stored on
// the plan always point at whatever is currently sellable.

import {
  paddleConfigured,
  createPaddleProduct, updatePaddleProduct,
  createPaddlePrice, archivePaddlePrice,
} from '@/lib/paddle'

export const PLAN_CURRENCY = process.env.PADDLE_CURRENCY ?? 'USD'

export type PlanCatalogueInput = {
  name: string
  price_monthly: number
  price_yearly: number
  description?: string | null
}

export type PlanCatalogueIds = {
  paddle_product_id: string | null
  paddle_price_id_monthly: string | null
  paddle_price_id_yearly: string | null
}

export type SyncResult = {
  ids: Partial<PlanCatalogueIds>
  /** Set when Paddle could not be reached or refused — the plan still saves. */
  warning?: string
}

/**
 * Creates the product and both prices for a brand-new plan.
 *
 * Never throws: a plan the super admin just typed out must still save even if
 * Paddle is unreachable or unconfigured. The caller surfaces `warning` and the
 * plan can be re-synced later.
 */
export async function createPlanInPaddle(plan: PlanCatalogueInput): Promise<SyncResult> {
  if (!paddleConfigured()) {
    return { ids: {}, warning: 'Paddle is not configured — the plan was saved but not published to Paddle.' }
  }

  const product = await createPaddleProduct(plan.name, plan.description ?? undefined)
  if (product.error || !product.data) {
    return { ids: {}, warning: `Saved, but Paddle rejected the product: ${product.error ?? 'unknown error'}` }
  }

  const productId = product.data.id
  const [monthly, yearly] = await Promise.all([
    createPaddlePrice({
      productId, amount: plan.price_monthly, currency: PLAN_CURRENCY,
      interval: 'month', description: `${plan.name} — monthly`,
    }),
    createPaddlePrice({
      productId, amount: plan.price_yearly, currency: PLAN_CURRENCY,
      interval: 'year', description: `${plan.name} — yearly`,
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
 */
export async function updatePlanInPaddle(
  current: PlanCatalogueIds & { name: string; price_monthly: number; price_yearly: number },
  next: PlanCatalogueInput,
): Promise<SyncResult> {
  if (!paddleConfigured()) {
    return { ids: {}, warning: 'Paddle is not configured — the plan was saved but not published to Paddle.' }
  }

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

  const cycles = [
    {
      changed: Number(next.price_monthly) !== Number(current.price_monthly),
      existing: current.paddle_price_id_monthly,
      amount: next.price_monthly,
      interval: 'month' as const,
      key: 'paddle_price_id_monthly' as const,
      label: 'monthly',
    },
    {
      changed: Number(next.price_yearly) !== Number(current.price_yearly),
      existing: current.paddle_price_id_yearly,
      amount: next.price_yearly,
      interval: 'year' as const,
      key: 'paddle_price_id_yearly' as const,
      label: 'yearly',
    },
  ]

  for (const cycle of cycles) {
    // A missing price is created even when the amount didn't change, so a
    // half-published plan repairs itself on the next save.
    if (!cycle.changed && cycle.existing) continue

    const created = await createPaddlePrice({
      productId: current.paddle_product_id,
      amount: cycle.amount,
      currency: PLAN_CURRENCY,
      interval: cycle.interval,
      description: `${next.name} — ${cycle.label}`,
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
