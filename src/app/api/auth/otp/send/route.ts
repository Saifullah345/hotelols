import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { generateOtpCode, createChallenge, OTP_COOKIE } from '@/lib/otp'
import { sendEmail } from '@/lib/email/resend'
import { otpEmailTemplate } from '@/lib/email/templates'

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
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Verify the credentials WITHOUT persisting a session — no cookies are set,
  // so the user has no real session until they pass the OTP step.
  const verifier = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn, error: signInError } = await verifier.auth.signInWithPassword({ email, password })

  if (signInError || !signIn.user) {
    // Supabase blocks unconfirmed users with an "Email not confirmed" error.
    if (signInError && /confirm/i.test(signInError.message)) {
      return NextResponse.json({ needsEmailVerification: true })
    }
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const user = signIn.user
  const admin = await createAdminClient()
  let profile: { role?: string } | null = null
  try {
    const result = await admin.from('profiles').select('role').eq('id', user.id).single()
    profile = result.data ?? null
  } catch {
    profile = null
  }

  const otpEnabled = (process.env.CUSTOMER_LOGIN_OTP ?? 'true').toLowerCase() !== 'false'

  // OTP only applies to customers.
  if (profile?.role !== 'customer' || !otpEnabled) {
    return NextResponse.json({ otpRequired: false })
  }

  // Defensive: admin-invited customers must confirm their email first.
  if (!user.email_confirmed_at) {
    return NextResponse.json({ needsEmailVerification: true })
  }

  const code = generateOtpCode()
  try {
    const { subject, html } = otpEmailTemplate(code)
    await sendEmail({ to: email, subject, html })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not send the verification code' },
      { status: 502 },
    )
  }

  const res = NextResponse.json({ otpRequired: true })
  res.cookies.set(OTP_COOKIE, createChallenge(email, code), cookieOpts)
  return res
}
