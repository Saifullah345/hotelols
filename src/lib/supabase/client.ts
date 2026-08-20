import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}

/**
 * The signed-in user, read from the session the browser already holds.
 *
 * `auth.getUser()` always calls the GoTrue `/user` endpoint, so a component
 * that opens with it pays a round-trip before it can even start loading its
 * own data. `getSession()` reads the stored session locally and only goes to
 * the network when the access token has actually expired.
 *
 * Trusting the local session is fine here and only here: this runs in the
 * browser, where the user controls everything anyway. Authorisation is decided
 * by RLS and by the server components and API routes, which verify the token
 * properly. Never use this to gate anything on the server.
 */
export async function getBrowserUser(
  supabase: ReturnType<typeof createClient>
): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
