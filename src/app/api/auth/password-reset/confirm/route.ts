import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyChallenge, PASSWORD_RESET_COOKIE } from '@/lib/otp'

const cookieOpts = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 600,
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  // The mobile app can't rely on the httpOnly cookie surviving between its two
  // fetch() calls (see send/route.ts), so it resends the challenge explicitly.
  const explicitChallenge = typeof body?.challenge === 'string' ? body.challenge : undefined

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = explicitChallenge ?? cookieStore.get(PASSWORD_RESET_COOKIE)?.value
  const result = verifyChallenge(token, email, code)

  if (!result.ok) {
    const res = NextResponse.json({ error: result.reason }, { status: 400 })
    if (result.nextToken) res.cookies.set(PASSWORD_RESET_COOKIE, result.nextToken, cookieOpts)
    else if (result.clear) res.cookies.delete(PASSWORD_RESET_COOKIE)
    return res
  }

  const admin = await createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (!profile) {
    const res = NextResponse.json({ error: 'No account found for that email' }, { status: 404 })
    res.cookies.delete(PASSWORD_RESET_COOKIE)
    return res
  }

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(PASSWORD_RESET_COOKIE)
  return res
}
