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
