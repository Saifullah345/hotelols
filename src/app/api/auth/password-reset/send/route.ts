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
  const { data: profile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()

  // Always generate a code and challenge, whether or not an account exists —
  // only email it out when one does. The response shape is identical either
  // way so this endpoint can't be used to enumerate registered emails.
  const code = generateOtpCode()
  if (profile) {
    try {
      const { subject, html } = passwordResetEmailTemplate(code)
      await sendEmail({ to: email, subject, html })
    } catch {
      // Swallow — still respond as if it succeeded, for the same reason.
    }
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
