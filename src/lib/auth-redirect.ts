import type { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/supabase/env'

/**
 * Where email confirmation links point, and where a confirmed user lands.
 *
 * Why the links don't use GoTrue's own `action_link`
 * ──────────────────────────────────────────────────
 * `admin.generateLink()` hands back an `action_link` of the form
 * `<supabase>/auth/v1/verify?token=…&type=signup&redirect_to=<app>`. GoTrue
 * validates that `redirect_to` against its SITE_URL + URI_ALLOW_LIST and, when
 * it isn't on the list, silently *replaces* it with SITE_URL instead of
 * erroring. On this instance SITE_URL is the Supabase host itself, so every
 * confirmation email shipped a link that bounced the user to
 * `https://supabase.n6solution.com` — never to the app.
 *
 * Even with the allow-list fixed that route is wrong for this app: links minted
 * by the admin API are implicit-flow, so GoTrue returns the session in the URL
 * *fragment* (`#access_token=…`), which a server route handler can't read —
 * `/auth/callback` would have found no `?code=` and redirected to
 * `/login?error=confirmation_failed`.
 *
 * So the emails link at this app directly and carry `properties.hashed_token`,
 * which `/auth/confirm` redeems with `verifyOtp()`. No redirect allow-list is
 * involved, and the session is set as cookies by the SSR client, server-side.
 */

/** The `verifyOtp` types an emailed confirmation link can carry. */
export type ConfirmLinkType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email'

const CONFIRM_LINK_TYPES: readonly ConfirmLinkType[] =
  ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

export function isConfirmLinkType(value: string | null): value is ConfirmLinkType {
  return !!value && (CONFIRM_LINK_TYPES as readonly string[]).includes(value)
}

export const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff:       '/staff/dashboard',
  customer:    '/',
}

/** Builds a confirmation link that points at this app's /auth/confirm route. */
export function buildConfirmUrl(tokenHash: string, type: ConfirmLinkType, next?: string): string {
  const url = new URL('/auth/confirm', getSiteUrl())
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', type)
  if (next) url.searchParams.set('next', next)
  return url.toString()
}

/**
 * The link to put in an email, from what `admin.generateLink()` returned.
 *
 * Prefers the app-hosted `/auth/confirm` link. Falls back to GoTrue's
 * `action_link` if this instance's admin API didn't return a `hashed_token`,
 * so the result is never worse than sending the raw action_link — see the
 * caveats at the top of this file for why that fallback usually won't land.
 */
export function verifyUrlFrom(
  properties: { hashed_token?: string | null; action_link?: string | null } | null | undefined,
  type: ConfirmLinkType,
  next?: string,
): string | null {
  const tokenHash = properties?.hashed_token
  if (tokenHash) return buildConfirmUrl(tokenHash, type, next)
  return properties?.action_link ?? null
}

/**
 * A `?next=` value is only honoured when it is a path on this origin — an
 * absolute or protocol-relative one would turn every confirmation email into
 * an open redirect.
 */
export function safeNextPath(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Where a just-authenticated user should land, given their profile role. */
export async function postAuthDestination(
  supabase: SupabaseServerClient,
  userId: string | undefined | null,
): Promise<string> {
  if (!userId) return '/'
  try {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    const role = (data as { role?: string } | null)?.role
    return (role && ROLE_REDIRECTS[role]) || '/'
  } catch {
    return '/'
  }
}
