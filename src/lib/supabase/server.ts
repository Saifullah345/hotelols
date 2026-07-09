import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from './env'

// The hotel-saas-mobile native app has no browser cookie jar, so it can't carry
// the @supabase/ssr session cookie every API route relies on. Instead it sends
// its Supabase access token as `Authorization: Bearer <token>`. When that header
// is present we build a plain supabase-js client scoped to that token (so
// PostgREST/RLS see the same auth.uid() a cookie session would) and prime its
// in-memory session so the routes' existing `supabase.auth.getUser()` (no-arg)
// calls resolve the caller exactly like they do for the web app. This is the
// only change needed for every existing API route to support mobile.
async function createClientFromBearerToken(token: string) {
  const { createClient: createSupabaseJsClient } = await import('@supabase/supabase-js')
  const client = createSupabaseJsClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // Not a real refresh token — only used if the access token were expired, in
  // which case we want this to fail closed (routes already 401 on no user).
  await client.auth.setSession({ access_token: token, refresh_token: token })
  return client
}

export async function createClient() {
  const hdrs = await headers()
  const authHeader = hdrs.get('authorization')
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) {
    return createClientFromBearerToken(bearerMatch[1])
  }

  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createAdminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
