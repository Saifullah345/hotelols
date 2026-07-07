import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { confirmEmailTemplate } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/supabase/env'

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
  const { data: existing } = await admin.from('profiles').select('id').ilike('email', email).limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  try {
    // generateLink({ type: 'signup' }) CREATES the (unconfirmed) user AND returns
    // the confirmation link in one step. We must NOT createUser() first — doing so
    // makes this fail with "User already registered". The link is in
    // properties.action_link (not "verification_url").
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name, role: 'customer' },
        redirectTo: `${getSiteUrl()}/auth/callback`,
      },
    })

    const verifyUrl = linkData?.properties?.action_link
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
