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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const activeRole = request.cookies.get(ROLE_COOKIE)?.value

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
