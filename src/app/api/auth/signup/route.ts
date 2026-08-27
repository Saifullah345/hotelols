import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { confirmEmailTemplate } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/supabase/env'
import { verifyUrlFrom } from '@/lib/auth-redirect'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const full_name = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'full_name, email, and password are required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Don't allow reusing an email that already has an account.
  const { data: existing } = await admin.from('profiles').select('id, role').ilike('email', email).limit(1)
  if (existing && existing.length > 0) {
    const role = existing[0].role
    let error = 'An account with this email already exists. Please sign in instead.'
    if (role === 'hotel_admin') {
      error = 'This email is already registered as a hotel account. Please sign in to manage your hotel.'
    } else if (role === 'customer') {
      error = 'You already have a customer account with this email. Sign in and use "List Your Property" in your dashboard if you want to register a hotel.'
    }
    return NextResponse.json({ error }, { status: 409 })
  }

  try {
    // generateLink({ type: 'signup' }) CREATES the (unconfirmed) user AND returns
    // the confirmation token in one step. We must NOT createUser() first — doing
    // so makes this fail with "User already registered". `verifyUrlFrom()` turns
    // the returned properties into a link at this app's /auth/confirm rather
    // than GoTrue's own action_link; see lib/auth-redirect.ts for why.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name, role: 'customer' },
        redirectTo: `${getSiteUrl()}/auth/callback`,
      },
    })

    const verifyUrl = verifyUrlFrom(linkData?.properties, 'signup')
    if (linkError || !verifyUrl) {
      return NextResponse.json(
        { error: linkError?.message || 'Failed to generate verification link' },
        { status: 400 },
      )
    }

    try {
      const { subject, html } = confirmEmailTemplate(full_name, verifyUrl)
      await sendEmail({ to: email, subject, html })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { error: 'Account created, but the verification email could not be sent. Please try again or contact support.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      userId: linkData.user?.id,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
