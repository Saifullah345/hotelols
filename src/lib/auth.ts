import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

/**
 * Why this module exists
 * ─────────────────────
 * `supabase.auth.getUser()` is not a local read — it is an HTTPS call to the
 * GoTrue `/auth/v1/user` endpoint, and auth-js caches nothing between calls.
 * A single hotel-admin navigation used to make it four times (middleware, the
 * layout, the page, and often a nested server component), then follow each one
 * with its own `profiles` lookup for `tenant_id`. That is six serial
 * round-trips to Supabase before the first row of real data is even requested.
 *
 * React's `cache()` scopes a result to one server request, so every call site
 * below shares one answer. The page still reads as if it authenticated itself;
 * it just no longer pays for it.
 */

/** The signed-in user, fetched at most once per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
})

/** The `profiles` row, selected in full. The index signature keeps columns that
 *  post-date the shared `Profile` type readable without a cast. */
export type AuthProfile = Profile & { [key: string]: unknown }

export type AuthContext = {
  user: User | null
  profile: AuthProfile | null
  /** The hotel this user belongs to — `profiles.tenant_id`. */
  tenantId: string | null
  role: string | null
}

/**
 * User + profile row in one memoized pass. Selects every column because the
 * admin layout renders the full profile; pages that only want `tenant_id` read
 * it off the same cached row instead of issuing a second query.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const user = await getCurrentUser()
  if (!user) return { user: null, profile: null, tenantId: null, role: null }

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = (data ?? null) as AuthProfile | null
  return {
    user,
    profile,
    tenantId: profile?.tenant_id ?? null,
    role: profile?.role ?? null,
  }
})

/**
 * The preamble almost every hotel-admin and staff page opens with: signed in,
 * and attached to a hotel. Redirects exactly where the hand-written versions
 * did, so swapping it in changes no behaviour.
 */
export async function requireTenant(): Promise<{ user: User; profile: AuthProfile | null; tenantId: string }> {
  const { user, profile, tenantId } = await getAuthContext()
  if (!user) redirect('/login')
  if (!tenantId) redirect('/login')
  return { user, profile, tenantId }
}

/** Signed-in check only, for pages that don't need a hotel. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
