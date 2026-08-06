// One definition of "is this hotel paid up", used by the admin dashboard, the
// public listing and the API guards so they can't disagree.

/** Days out from expiry at which the hotel starts being warned. */
export const EXPIRY_WARNING_DAYS = 7

export type SubscriptionRow = {
  subscription_status?: string | null
  plan_expires_at?: string | null
}

export type SubscriptionState =
  | 'none'      // never subscribed — legacy hotel, not restricted
  | 'active'    // paid up
  | 'trialing'
  | 'expiring'  // still valid, but ends within the warning window
  | 'past_due'  // payment failed, Paddle is retrying — access continues
  | 'expired'   // no longer paid up: read-only, delisted

export interface SubscriptionInfo {
  state: SubscriptionState
  /** Whole days until expiry; negative once past. Null when nothing is on record. */
  daysLeft: number | null
  expiresAt: Date | null
  /** False once the hotel must stop operating. */
  canOperate: boolean
  /** False once the hotel should disappear from the public site. */
  publiclyVisible: boolean
}

export function getSubscription(
  hotel: SubscriptionRow | null | undefined,
  now: number = Date.now(),
): SubscriptionInfo {
  const status = hotel?.subscription_status ?? null
  const expiresAt = hotel?.plan_expires_at ? new Date(hotel.plan_expires_at) : null
  const validExpiry = expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt : null

  const daysLeft = validExpiry
    ? Math.ceil((validExpiry.getTime() - now) / 86_400_000)
    : null

  // Hotels that predate billing have no subscription on record. They keep
  // working — switching billing on must not lock out existing customers.
  if (!status && !validExpiry) {
    return { state: 'none', daysLeft: null, expiresAt: null, canOperate: true, publiclyVisible: true }
  }

  const lapsed = validExpiry ? validExpiry.getTime() <= now : false

  // Cancelled but still inside the paid period: they bought those days.
  if (status === 'canceled' || status === 'paused') {
    return lapsed
      ? { state: 'expired', daysLeft, expiresAt: validExpiry, canOperate: false, publiclyVisible: false }
      : { state: 'expiring', daysLeft, expiresAt: validExpiry, canOperate: true, publiclyVisible: true }
  }

  if (lapsed) {
    return { state: 'expired', daysLeft, expiresAt: validExpiry, canOperate: false, publiclyVisible: false }
  }

  // Paddle is retrying a failed charge. Access continues while it does — cutting
  // a hotel off over a card that expired mid-week helps nobody.
  if (status === 'past_due') {
    return { state: 'past_due', daysLeft, expiresAt: validExpiry, canOperate: true, publiclyVisible: true }
  }

  if (status === 'trialing') {
    return { state: 'trialing', daysLeft, expiresAt: validExpiry, canOperate: true, publiclyVisible: true }
  }

  if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) {
    return { state: 'expiring', daysLeft, expiresAt: validExpiry, canOperate: true, publiclyVisible: true }
  }

  return { state: 'active', daysLeft, expiresAt: validExpiry, canOperate: true, publiclyVisible: true }
}

/** Message for the hotel admin, or null when there's nothing to say. */
export function subscriptionMessage(info: SubscriptionInfo, planName?: string | null): string | null {
  const plan = planName ? `Your ${planName} plan` : 'Your plan'
  switch (info.state) {
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
