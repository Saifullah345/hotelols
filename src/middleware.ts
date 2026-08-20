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

  // `getClaims()` verifies the access token's signature against the project's
  // JWKS, which is fetched once per server process and cached — so on every
  // request after the first this is local crypto, not a round-trip to GoTrue.
  // Middleware only needs to know "is this a valid session", which the verified
  // claims answer completely. Projects still on a legacy symmetric JWT secret
  // have no public key to verify against; there getClaims() falls back to the
  // same getUser() call this used to make, so nothing regresses.
  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (error) {
      // Expired / revoked refresh token — clear cookies and treat as logged out
      if (error.status === 400 || error.message?.toLowerCase().includes('refresh token')) {
        await supabase.auth.signOut()
      }
    } else if (data?.claims?.sub) {
      user = { id: data.claims.sub }
    }
  } catch {
    // Network, clock skew, or malformed token — treat as unauthenticated
  }

  // Unauthenticated: block protected routes and select-role
  if (!user) {
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
