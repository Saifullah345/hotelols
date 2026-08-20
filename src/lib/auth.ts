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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const fetchProfile = async (
  supabase: SupabaseServerClient,
  id: string,
): Promise<AuthProfile | null> => {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
  return (data ?? null) as AuthProfile | null
}

/**
 * The `sub` claim, read straight out of the session cookie's access token.
 *
 * Deliberately no signature check: this value is used for one thing only —
 * deciding which `profiles` row to ask for — and never as proof of who the
 * caller is. A forged token names a row PostgREST will refuse to return, and
 * `getCurrentUser()` below rejects the request regardless. Returns null on
 * anything unexpected so the caller falls back to the verified path.
 */
function unverifiedSubject(accessToken: string | undefined): string | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' && sub ? sub : null
  } catch {
    return null
  }
}

/**
 * User + profile row in one memoized pass. Selects every column because the
 * admin layout renders the full profile; pages that only want `tenant_id` read
 * it off the same cached row instead of issuing a second query.
 *
 * The two reads run concurrently rather than one after the other. Fetching the
 * profile normally has to wait for `getUser()` to come back with an id, which
 * put two serial Supabase round-trips in front of every authenticated page.
 * Reading the id from the session cookie instead costs nothing and lets both
 * go out at once.
 *
 * It stays honest about which of the two is authoritative: the speculative row
 * is used only if it belongs to the user `getUser()` actually verified, and
 * otherwise it is thrown away and re-fetched the slow way. Worst case is the
 * behaviour this replaced; it is never less correct, only sometimes slower.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient()

  let claimedId: string | null = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    claimedId = unverifiedSubject(session?.access_token)
  } catch {
    claimedId = null
  }

  const [user, speculative] = await Promise.all([
    getCurrentUser(),
    claimedId ? fetchProfile(supabase, claimedId) : Promise.resolve(null),
  ])

  if (!user) return { user: null, profile: null, tenantId: null, role: null }

  const profile = speculative?.id === user.id
    ? speculative
    : await fetchProfile(supabase, user.id)
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
