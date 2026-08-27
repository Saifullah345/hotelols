export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!value) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  try {
    return new URL(value).origin
  } catch {
    return value.replace(/\/rest\/v1\/?$/, '')
  }
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!value) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return value
}

export function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!value) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return value
}

// Canonical public site URL, used to build links inside emails (signup
// confirmation, customer invites) so they always point at the deployed app
// instead of whatever host the request originated from (e.g. localhost).
// Set NEXT_PUBLIC_SITE_URL in your environment.
//
// Server-only — every caller is an API route handler or an email template. The
// Vercel fallback below relies on that, since it is not a NEXT_PUBLIC_ variable.
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  // Vercel sets this to the project's production domain on every deployment,
  // including previews. A forgotten NEXT_PUBLIC_SITE_URL then still produces a
  // link to the live app. This matters more than it looks: the old hardcoded
  // default was hotelmanagement.n6solution.com, which stopped resolving to any
  // deployment, so every confirmation email sent from an environment missing
  // the variable led to a Vercel DEPLOYMENT_NOT_FOUND page.
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProductionUrl) return `https://${vercelProductionUrl.replace(/\/+$/, '')}`

  return 'https://www.bookqayam.com'
}