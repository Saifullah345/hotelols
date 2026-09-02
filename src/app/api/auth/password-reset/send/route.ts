import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateOtpCode, createChallenge, PASSWORD_RESET_COOKIE } from '@/lib/otp'
import { sendEmail } from '@/lib/email/resend'
import { passwordResetEmailTemplate } from '@/lib/email/templates'

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
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  // `maybeSingle()` is deliberately avoided: it turns "two profiles share this
  // address" into an error and a null row, which would read as "no account".
  const { data: profiles, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)

  // A failed lookup is NOT the same as "no account" — reporting a dead admin
  // client, an RLS surprise or a network blip as "no account found for that
  // email" sends the user off to re-register an address they already own.
  // Distinguish the two.
  if (lookupError) {
    console.error('[password-reset/send] profile lookup failed:', lookupError)
    return NextResponse.json(
      { error: 'Could not verify that email right now. Please try again shortly.' },
      { status: 503 },
    )
  }

  // A code is only ever issued for an address that has an accountand an
  // unknown address is told so outright.
  //
  // NOTE: this is a deliberate product decision that replaces the previous
  // uniform "if an account exists…" response. The tradeoff is that this
  // endpoint now confirms whether any given email is registered, so it can be
  // used to enumerate accounts — the reason the uniform response existed. Rate
  // limiting per IP/email is the mitigation worth adding next.
  if (!profiles || profiles.length === 0) {
    return NextResponse.json(
      { error: 'No account found for that email address.' },
      { status: 404 },
    )
  }

  const code = generateOtpCode()
  try {
    const { subject, html } = passwordResetEmailTemplate(code)
    await sendEmail({ to: email, subject, html })
  } catch {
    return NextResponse.json(
      { error: 'Could not send the reset code. Please try again in a moment.' },
      { status: 502 },
    )
  }

  // The mobile app can't rely on the httpOnly cookie surviving across two
  // separate fetch() calls to a cross-origin API (no shared browser cookie
  // jar), so it also gets the signed challenge token back in the body and
  // threads it through explicitly on /confirm. This isn't a credential on
  // its own — it just wraps a hashed code + expiry + attempt counter — so
  // handing it to the client doesn't weaken the code itself.
  const token = createChallenge(email, code)
  const res = NextResponse.json({ ok: true, challenge: token })
  res.cookies.set(PASSWORD_RESET_COOKIE, token, cookieOpts)
  return res
}
