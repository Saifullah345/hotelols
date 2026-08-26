import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postAuthDestination, safeNextPath } from '@/lib/auth-redirect'

/**
 * PKCE / OAuth callback: exchanges a `?code=` for a session.
 *
 * Emailed confirmation links do *not* come through here — they are implicit
 * flow and return their session in the URL fragment, which a server route can't
 * see. Those go to /auth/confirm instead.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Honour an explicit ?next=, otherwise send the user to their role's home.
      const dest = next ?? await postAuthDestination(supabase, data.user?.id)
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
