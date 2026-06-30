import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyChallenge, OTP_COOKIE } from '@/lib/otp'

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
  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(OTP_COOKIE)?.value
  const result = verifyChallenge(token, email, code)

  if (result.ok) {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete(OTP_COOKIE)
    return res
  }

  const res = NextResponse.json({ error: result.reason }, { status: 400 })
  if (result.nextToken) {
    res.cookies.set(OTP_COOKIE, result.nextToken, cookieOpts)
  } else if (result.clear) {
    res.cookies.delete(OTP_COOKIE)
  }
  return res
}
