import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { confirmEmailTemplate } from '@/lib/email/templates'
import { getSiteUrl } from '@/lib/supabase/env'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const full_name    = typeof body?.full_name    === 'string' ? body.full_name.trim()                    : ''
  const email        = typeof body?.email        === 'string' ? body.email.trim().toLowerCase()           : ''
  const password     = typeof body?.password     === 'string' ? body.password                             : ''
  const hotel_name   = typeof body?.hotel_name   === 'string' ? body.hotel_name.trim()                   : ''
  const city         = typeof body?.city         === 'string' ? body.city.trim()                          : ''
  const country      = typeof body?.country      === 'string' ? body.country.trim()                       : 'Pakistan'
  const address      = typeof body?.address      === 'string' ? body.address.trim()                       : ''
  const hotel_phone  = typeof body?.hotel_phone  === 'string' ? body.hotel_phone.trim()                  : ''
  const hotel_email  = typeof body?.hotel_email  === 'string' ? body.hotel_email.trim().toLowerCase()    : email

  if (!full_name || !email || !password || !hotel_name || !city) {
    return NextResponse.json({ error: 'full_name, email, password, hotel_name, and city are required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: existing } = await admin.from('profiles').select('id').ilike('email', email).limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const { data: plan } = await admin.from('plans').select('id').eq('name', 'basic').single()
  if (!plan) {
    return NextResponse.json({ error: 'Could not find a starter plan. Please contact support.' }, { status: 500 })
  }

  const slug =
    hotel_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') +
    '-' +
    Date.now().toString(36)

  try {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name, role: 'hotel_admin' },
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

    const userId = linkData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    const { error: hotelError } = await admin.from('hotels').insert({
      name: hotel_name,
      slug,
      city,
      country,
      address,
      phone: hotel_phone,
      email: hotel_email,
      owner_id: userId,
      plan_id: plan.id,
      status: 'pending',
    })

    if (hotelError) {
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create hotel record. Please try again.' }, { status: 500 })
    }

    try {
      const { subject, html } = confirmEmailTemplate(full_name, verifyUrl)
      await sendEmail({ to: email, subject, html })
    } catch {
      return NextResponse.json(
        { error: 'Account created but verification email could not be sent. Please contact support.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Check your email to verify and activate your account.',
    })
  } catch (error) {
    console.error('Hotel signup error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
