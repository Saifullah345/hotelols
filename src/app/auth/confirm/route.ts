import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfirmLinkType, postAuthDestination, safeNextPath } from '@/lib/auth-redirect'

/**
 * Redeems an emailed confirmation token: signup, invite, magic link, recovery.
 *
 * The link is built by lib/auth-redirect.ts and points here rather than at
 * GoTrue's /auth/v1/verify — read the note at the top of that file for why.
 * `verifyOtp()` exchanges the token for a session and the SSR client writes it
 * to cookies, so the user is signed in by the time we redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeNextPath(searchParams.get('next'))

  if (tokenHash && isConfirmLinkType(type)) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      // verifyOtp already returned the user, so there is no getUser() round-trip
      // to pay here.
      const dest = next ?? await postAuthDestination(supabase, data.user?.id)
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
