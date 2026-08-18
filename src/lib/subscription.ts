// One definition of "is this hotel paid up", used by the admin dashboard, the
// public listing and the API guards so they can't disagree.

/** Days out from expiry at which the hotel starts being warned. */
export const EXPIRY_WARNING_DAYS = 7

/** What a hotel's `subscription_status` is set to before its first purchase. */
export const UNSUBSCRIBED = 'unsubscribed'

export type SubscriptionRow = {
  subscription_status?: string | null
  plan_expires_at?: string | null
  trial_ends_at?: string | null
  subscription_cancel_at?: string | null
}

export type SubscriptionState =
  | 'none'         // never subscribed — legacy hotel, not restricted
  | 'unsubscribed' // signed up but hasn't bought a plan yet: nothing works
  | 'active'       // paid up
  | 'trialing'     // inside a free trial; the card is charged when it ends
  | 'expiring'     // still valid, but ends within the warning window
  | 'past_due'     // payment failed, Paddle is retrying — access continues
  | 'expired'      // no longer paid up: read-only, delisted

export interface SubscriptionInfo {
  state: SubscriptionState
  /** Whole days until expiry; negative once past. Null when nothing is on record. */
  daysLeft: number | null
  expiresAt: Date | null
  /** True while the free trial is running. */
  isTrial: boolean
  /** End of the free trial, while one is running. */
  trialEndsAt: Date | null
  /** Whole days of trial left, rounded up — the number shown in the banner. */
  trialDaysLeft: number | null
  /** Set when a cancellation is scheduled: access ends on this date. */
  cancelAt: Date | null
  /** False once the hotel must stop operating. */
  canOperate: boolean
  /** False once the hotel should disappear from the public site. */
  publiclyVisible: boolean
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

/** Whole days from now until `date`, rounded up: 13.2 days left reads as 14. */
function daysUntil(date: Date | null, now: number): number | null {
  return date ? Math.ceil((date.getTime() - now) / 86_400_000) : null
}

export function getSubscription(
  hotel: SubscriptionRow | null | undefined,
  now: number = Date.now(),
): SubscriptionInfo {
  const status    = hotel?.subscription_status ?? null
  const expiresAt = toDate(hotel?.plan_expires_at)
  const trialEnds = toDate(hotel?.trial_ends_at)
  const cancelAt  = toDate(hotel?.subscription_cancel_at)

  const daysLeft = daysUntil(expiresAt, now)

  const base = {
    daysLeft,
    expiresAt,
    isTrial: false,
    trialEndsAt: null,
    trialDaysLeft: null,
    cancelAt,
  }

  // Signed up, never bought: the dashboard stays shut until a plan is paid for.
  if (status === UNSUBSCRIBED) {
    return {
      ...base,
      state: 'unsubscribed',
      daysLeft: null,
      expiresAt: null,
      canOperate: false,
      publiclyVisible: false,
    }
  }

  // Hotels that predate billing have no subscription on record. They keep
  // working — switching billing on must not lock out existing customers.
  if (!status && !expiresAt) {
    return {
      ...base,
      state: 'none',
      daysLeft: null,
      expiresAt: null,
      canOperate: true,
      publiclyVisible: true,
    }
  }

  const lapsed = expiresAt ? expiresAt.getTime() <= now : false

  // A trial that hasn't run out yet. Checked before the cancelled and lapsed
  // branches so a hotel that cancels mid-trial still sees its countdown and
  // keeps the days it was promised.
  if (status === 'trialing' && trialEnds && trialEnds.getTime() > now) {
    return {
      ...base,
      state: 'trialing',
      // While trialing the paid-until date *is* the trial end, so the two
      // counters agree even if plan_expires_at was written from a stale payload.
      daysLeft: daysUntil(trialEnds, now),
      expiresAt: trialEnds,
      isTrial: true,
      trialEndsAt: trialEnds,
      trialDaysLeft: daysUntil(trialEnds, now),
      canOperate: true,
      publiclyVisible: true,
    }
  }

  // Cancelled but still inside the paid period: they bought those days.
  if (status === 'canceled' || status === 'paused') {
    return lapsed
      ? { ...base, state: 'expired',  canOperate: false, publiclyVisible: false }
      : { ...base, state: 'expiring', canOperate: true,  publiclyVisible: true }
  }

  if (lapsed) {
    return { ...base, state: 'expired', canOperate: false, publiclyVisible: false }
  }

  // Paddle is retrying a failed charge. Access continues while it does — cutting
  // a hotel off over a card that expired mid-week helps nobody.
  if (status === 'past_due') {
    return { ...base, state: 'past_due', canOperate: true, publiclyVisible: true }
  }

  // Status says trialing but the trial date is gone or already past: Paddle is
  // charging (or has charged) the card. Treated as an ordinary paid plan, which
  // the expiry checks above have already vouched for.
  if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) {
    return { ...base, state: 'expiring', canOperate: true, publiclyVisible: true }
  }

  return { ...base, state: 'active', canOperate: true, publiclyVisible: true }
}

/** Message for the hotel admin, or null when there's nothing to say. */
export function subscriptionMessage(info: SubscriptionInfo, planName?: string | null): string | null {
  const plan = planName ? `Your ${planName} plan` : 'Your plan'
  switch (info.state) {
    case 'unsubscribed':
      return 'Choose a plan to activate your hotel. Nothing can be managed until a subscription is running.'
    case 'expired':
      return `${plan} has expired. Your hotel is hidden from guests and management is read-only until you renew.`
    case 'past_due':
      return `We couldn't take payment for ${plan.toLowerCase()}. Update your payment method to avoid losing access.`
    case 'expiring':
      if (info.daysLeft === null) return `${plan} is ending soon.`
      if (info.daysLeft <= 0)  return `${plan} expires today.`
      if (info.daysLeft === 1) return `${plan} expires tomorrow. Renew to stay listed.`
      return `${plan} expires in ${info.daysLeft} days. Renew to stay listed.`
    default:
      return null
  }
}

/** "14 days left", counted the way a person would say it. */
export function trialCountdown(daysLeft: number | null): string {
  if (daysLeft === null) return 'Trial running'
  if (daysLeft <= 0) return 'Last day'
  if (daysLeft === 1) return '1 day left'
  return `${daysLeft} days left`
}
