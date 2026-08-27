import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { ROLE_COOKIE } from '@/lib/session'

const roleRedirects: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff:       '/staff/dashboard',
  customer:    '/',
}

const protectedRoutes = ['/super-admin', '/hotel-admin', '/staff', '/customer']
const authOnlyRoutes  = ['/login', '/register', '/register-hotel']

export async function middleware(request: NextRequest) {
  // Server components can't read the current path. The hotel-admin layout needs
  // it to keep billing reachable while the rest of the dashboard is locked.
  request.headers.set('x-pathname', request.nextUrl.pathname)

  const pathname = request.nextUrl.pathname
  const activeRole = request.cookies.get(ROLE_COOKIE)?.value

  // Fast path: if no Supabase session cookie exists the user is definitely
  // logged out — skip the GoTrue network call entirely.
  const hasCookie = request.cookies.getAll().some(c => c.name.includes('-auth-token'))
  if (!hasCookie) {
    if (protectedRoutes.some(r => pathname.startsWith(r)) || pathname === '/select-role') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // `getSession()`, not `getUser()`. getUser() is an HTTPS call to GoTrue's
  // /auth/v1/user on every single request this matcher covers — including the
  // ~14 RSC prefetches the sidebar fires on hover — and against a remote
  // Supabase host that is a fixed ~165 ms added to every navigation before the
  // page has even started rendering. getSession() reads the session out of the
  // cookie and only goes to the network when the access token has actually
  // expired and needs refreshing, which is the one case where the round-trip
  // buys something.
  //
  // The trade is that getSession() does not verify the token's signature. That
  // is fine *here* and nowhere else: everything this function does with the
  // answer is coarse routing — bounce anonymous users off /hotel-admin, bounce
  // signed-in users off /login. It authorises nothing, and it never reads a
  // field off the session, only whether there is one. A forged cookie gets past
  // this and is then rejected by the layout's getAuthContext(), which still
  // calls getUser(), and by RLS on every query underneath it.
  //
  // Not `getClaims()` either: it reports an unverifiable token as
  // AuthInvalidJwtError, status 400 — the same status a revoked refresh token
  // uses — so every JWKS hiccup fell into the signOut() branch below and
  // destroyed a working session. Don't reintroduce it without splitting those
  // two cases apart first.
  let signedIn = false
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      // Expired / revoked refresh token — clear cookies and treat as logged out.
      // Scoped to refresh-token failures only: any other error means "couldn't
      // confirm this request", which must not cost the user their session.
      const isRefreshFailure =
        error.message?.toLowerCase().includes('refresh token') ||
        (error as { code?: string }).code === 'refresh_token_not_found'
      if (isRefreshFailure) {
        await supabase.auth.signOut()
      }
    } else {
      // Truthiness only — reading `data.session.user` would trip the
      // "user object from getSession() could be insecure" proxy warning on
      // every request, and nothing here needs the user's fields.
      signedIn = Boolean(data.session)
    }
  } catch {
    // Network or unexpected error — treat as unauthenticated
  }

  // Unauthenticated: block protected routes and select-role
  if (!signedIn) {
    if (protectedRoutes.some(r => pathname.startsWith(r)) || pathname === '/select-role') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Authenticated on auth-only pages: redirect to active dashboard or role picker
  if (authOnlyRoutes.some(r => pathname === r)) {
    if (activeRole) {
      return NextResponse.redirect(new URL(roleRedirects[activeRole] ?? '/', request.url))
    }
    return NextResponse.redirect(new URL('/select-role', request.url))
  }

  // Authenticated on protected routes without an active role: pick one first
  if (protectedRoutes.some(r => pathname.startsWith(r)) && !activeRole) {
    return NextResponse.redirect(new URL('/select-role', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Exclude API routes — they auth themselves and don't need session refresh.
  // Excluding them removes one GoTrue round-trip per client-side fetch.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
