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
  const cover_image  = typeof body?.cover_image  === 'string' ? body.cover_image                          : null
  const selected_plan_id = typeof body?.plan_id  === 'string' ? body.plan_id                             : null

  if (!full_name || !email || !password || !hotel_name || !city) {
    return NextResponse.json({ error: 'full_name, email, password, hotel_name, and city are required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: existing } = await admin.from('profiles').select('id, role').ilike('email', email).limit(1)
  if (existing && existing.length > 0) {
    const role = existing[0].role
    let error = 'An account with this email already exists. Please sign in instead.'
    if (role === 'customer') {
      error = 'You already have a customer account with this email. Sign in and use "List Your Property" in your dashboard to register a hotel — no new account needed.'
    } else if (role === 'hotel_admin') {
      error = 'A hotel account is already registered with this email. Please sign in to access your hotel dashboard.'
    }
    return NextResponse.json({ error }, { status: 409 })
  }

  // Use the plan the hotel owner selected, fallback to the first active plan
  let plan: { id: string } | null = null
  if (selected_plan_id) {
    const { data } = await admin.from('plans').select('id').eq('id', selected_plan_id).eq('is_active', true).single()
    plan = data
  }
  if (!plan) {
    const { data } = await admin.from('plans').select('id').eq('is_active', true).order('price_monthly').limit(1).single()
    plan = data
  }
  if (!plan) {
    return NextResponse.json({ error: 'No active plans found. Please contact support.' }, { status: 500 })
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

    const { data: hotel, error: hotelError } = await admin.from('hotels').insert({
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
      currency: 'USD',
      ...(cover_image ? { cover_image, images: [cover_image] } : {}),
    }).select('id').single()

    if (hotelError || !hotel) {
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create hotel record. Please try again.' }, { status: 500 })
    }

    // The new-user trigger only sets role/full_name — link this hotel as the
    // user's tenant now, otherwise they'd sign in with no hotel attached and
    // a super admin would have to link it manually afterward.
    const { error: profileError } = await admin.from('profiles').update({ tenant_id: hotel.id }).eq('id', userId)

    if (profileError) {
      await admin.from('hotels').delete().eq('id', hotel.id)
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to link your account to the hotel. Please try again.' }, { status: 500 })
    }

    // Keep user_roles in sync: the trigger inserted (hotel_admin, tenant_id=NULL);
    // now that the hotel exists, set the real tenant_id.
    await admin.from('user_roles')
      .update({ tenant_id: hotel.id })
      .eq('user_id', userId)
      .eq('role', 'hotel_admin')
      .is('tenant_id', null)

    let emailSent = true
    try {
      const { subject, html } = confirmEmailTemplate(full_name, verifyUrl)
      await sendEmail({ to: email, subject, html })
    } catch (emailErr) {
      emailSent = false
      console.error('Verification email failed (account was created successfully):', emailErr)
    }

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Registration submitted. Check your email to verify and activate your account.'
        : 'Account created successfully. Verification email could not be sent — please ask your super admin to activate your account, or try logging in directly.',
    })
  } catch (error) {
    console.error('Hotel signup error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
