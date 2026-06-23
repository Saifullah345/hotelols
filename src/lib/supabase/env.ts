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
// Set NEXT_PUBLIC_SITE_URL in your environment; falls back to the production URL.
export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL
  if (value) return value.replace(/\/+$/, '')
  return 'https://hotelols.vercel.app'
}