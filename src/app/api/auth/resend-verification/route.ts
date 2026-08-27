import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { confirmEmailTemplate } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/supabase/env'
import { verifyUrlFrom } from '@/lib/auth-redirect'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Look up the user — must exist and must be unconfirmed
  const { data: users, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 })
  }

  const user = users.users.find(u => u.email?.toLowerCase() === email)
  if (!user) {
    // Return success anyway to avoid user enumeration
    return NextResponse.json({ success: true })
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ error: 'This email is already verified. Please sign in.' }, { status: 409 })
  }

  // Generate a new magic link — clicking it confirms the email and signs the user in
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  })

  const verifyUrl = verifyUrlFrom(linkData?.properties, 'magiclink')
  if (linkError || !verifyUrl) {
    return NextResponse.json(
      { error: linkError?.message || 'Failed to generate verification link' },
      { status: 500 },
    )
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''

  try {
    const { subject, html } = confirmEmailTemplate(fullName, verifyUrl)
    await sendEmail({ to: email, subject, html })
  } catch (err) {
    console.error('Failed to resend verification email:', err)
    return NextResponse.json(
      { error: 'Could not send the email. Please try again.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true })
}
