// ── Plan limits (max_rooms / max_staff) ─────────────────────────────────────
//
// -1 is the stored value for "no limit". Any other negative is bad data, and is
// read the same way on purpose: a plan saved with -20 would otherwise make
// `used >= max` true from the very first room and bar the hotel from adding
// any at all, under the message "your plan allows up to -20 rooms". Entering
// one is blocked in the plan form and in the plans API — this is the safety net
// for rows that predate those checks or were edited straight in the database.

/** True when the plan places no limit on this resource. */
export function isUnlimited(max: number | null | undefined): boolean {
  return max === null || max === undefined || max < 0
}

/** True when `used` has reached what the plan allows. */
export function limitReached(max: number | null | undefined, used: number): boolean {
  return !isUnlimited(max) && used >= (max as number)
}

/** 0–100 integer representing how full the quota is. Returns 0 for unlimited plans. */
export function usagePercent(max: number | null | undefined, used: number): number {
  if (isUnlimited(max) || (max as number) <= 0) return 0
  return Math.min(100, Math.round((used / (max as number)) * 100))
}

/** Severity level for proactive threshold alerts. */
export type UsageLevel = 'normal' | 'warning' | 'critical' | 'limit'

/**
 * normal  — under 80%
 * warning — 80–89% (approaching limit)
 * critical — 90–99% (nearly at limit)
 * limit   — 100%+ (blocked)
 */
export function usageLevel(max: number | null | undefined, used: number): UsageLevel {
  if (limitReached(max, used)) return 'limit'
  const pct = usagePercent(max, used)
  if (pct >= 90) return 'critical'
  if (pct >= 80) return 'warning'
  return 'normal'
}

/** "Unlimited rooms" / "Up to 20 rooms" — never "Up to -20 rooms". */
export function describeLimit(max: number | null | undefined, noun: string): string {
  return isUnlimited(max) ? `Unlimited ${noun}` : `Up to ${max} ${noun}`
}

export type PlanFeatures = {
  listing: boolean
  housekeeping: boolean
  reviews: boolean
  onlineBooking: boolean
  advancedReports: boolean
  apiAccess: boolean
  multiProperty: boolean
}

// Shape of the raw plan row returned from Supabase
export type PlanDbData = {
  name?: string | null
  max_rooms?: number | null
  max_staff?: number | null
  feature_listing?:          boolean | null
  feature_housekeeping?:     boolean | null
  feature_reviews?:          boolean | null
  feature_online_booking?:   boolean | null
  feature_advanced_reports?: boolean | null
  feature_api_access?:       boolean | null
  feature_multi_property?:   boolean | null
}

export function getPlanFeatures(plan: PlanDbData | null | undefined): PlanFeatures {
  if (!plan) {
    return { listing: true, housekeeping: true, reviews: true, onlineBooking: true, advancedReports: true, apiAccess: false, multiProperty: false }
  }

  // Post-migration: DB feature flag columns are present — trust them over the name.
  if (plan.feature_housekeeping !== null && plan.feature_housekeeping !== undefined) {
    return {
      listing:         plan.feature_listing          ?? true,
      housekeeping:    plan.feature_housekeeping     ?? true,
      reviews:         plan.feature_reviews          ?? true,
      onlineBooking:   plan.feature_online_booking   ?? true,
      advancedReports: plan.feature_advanced_reports ?? true,
      apiAccess:       plan.feature_api_access        ?? false,
      multiProperty:   plan.feature_multi_property   ?? false,
    }
  }

  // Pre-migration fallback: derive from plan name.
  const name = (plan.name ?? '').toLowerCase()
  const isStarter = name === 'starter'
  const isProPlus = name === 'pro' || name === 'enterprise'
  return {
    listing:         true,
    housekeeping:    !isStarter,
    reviews:         !isStarter,
    onlineBooking:   !isStarter,
    advancedReports: !isStarter,
    apiAccess:       isProPlus,
    multiProperty:   isProPlus,
  }
}
