// Where a plan sits on the upgrade ladder, and which way a change moves.
//
// Used by the billing page, the checkout guard and the webhook, so all three
// agree on what counts as an upgrade. A hotel may only move up the ladder —
// see `canMoveTo`.

export type RankablePlan = {
  id?: string
  name?: string | null
  price_monthly?: number | string | null
  tier_rank?: number | string | null
}

export type PlanDirection = 'new' | 'upgrade' | 'downgrade' | 'same'

/**
 * Position on the ladder. `tier_rank` is authoritative; price is only a
 * fallback for a database where migration 032 hasn't been applied yet, and it
 * gets custom-priced tiers (Enterprise sits at 0.01) wrong — which is exactly
 * why the column exists.
 */
export function planRank(plan: RankablePlan | null | undefined): number {
  if (!plan) return 0
  const rank = Number(plan.tier_rank)
  if (Number.isFinite(rank) && rank > 0) return rank
  const price = Number(plan.price_monthly)
  return Number.isFinite(price) ? price : 0
}

/** Which way a move from `current` to `target` goes. */
export function planDirection(
  current: RankablePlan | null | undefined,
  target: RankablePlan | null | undefined,
): PlanDirection {
  if (!target) return 'same'
  if (!current) return 'new'
  if (current.id && target.id && current.id === target.id) return 'same'

  const from = planRank(current)
  const to   = planRank(target)
  if (to > from) return 'upgrade'
  if (to < from) return 'downgrade'
  // Same rank, different plan: a sideways move is no better than a downgrade,
  // so it is not offered either.
  return 'same'
}

/**
 * Whether the upgrade-only rule applies at all.
 *
 * It only binds while a subscription is actually live. A hotel whose plan was
 * assigned at registration but never paid for, or one whose subscription has
 * lapsed, is choosing a plan from scratch and may pick any of them — locking
 * someone out of the cheap tier because of a plan they never paid for would be
 * wrong.
 */
export function subscriptionIsLive(status: string | null | undefined, expiresAt?: string | null): boolean {
  const live = status === 'active' || status === 'trialing' || status === 'past_due'
  if (!live) return false
  if (!expiresAt) return true
  const end = new Date(expiresAt).getTime()
  return !Number.isFinite(end) || end > Date.now()
}

export type MoveCheck = { allowed: boolean; direction: PlanDirection; reason?: string }

/** The rule itself: with a live subscription, only a higher-ranked plan is allowed. */
export function canMoveTo(
  current: RankablePlan | null | undefined,
  target: RankablePlan | null | undefined,
  opts: { live: boolean },
): MoveCheck {
  const direction = planDirection(current, target)
  if (!opts.live) return { allowed: true, direction }

  if (direction === 'downgrade') {
    return {
      allowed: false,
      direction,
      reason: `Your ${current?.name ?? 'current'} plan can't be changed to the lower ${target?.name ?? 'selected'} plan. Contact support if you need to move down a tier.`,
    }
  }
  if (direction === 'same') {
    return {
      allowed: false,
      direction,
      reason: `You are already on ${current?.name ?? 'this plan'}.`,
    }
  }
  return { allowed: true, direction }
}
