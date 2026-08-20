import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/supabase/env'
import { sendEmail } from '@/lib/email/resend'
import { staffWelcomeTemplate, customerInviteTemplate } from '@/lib/email/templates'
import { limitReached } from '@/lib/plan-features'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!caller || !['super_admin', 'hotel_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, role, hotel_id, department, position, permissions, country, city, address, shift, salary } = body
  const password = body.password
  const email: string = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'full_name, email, and role are required' }, { status: 400 })
  }

  if (role === 'super_admin') {
    return NextResponse.json(
      { error: 'Super admin accounts cannot be created here. Create one directly in Supabase.' },
      { status: 403 },
    )
  }

  if (caller.role === 'hotel_admin' && role !== 'staff') {
    return NextResponse.json({ error: 'Hotel admins can only add staff members' }, { status: 403 })
  }

  const adminClient = await createAdminClient()
  const effectiveHotelId = caller.role === 'hotel_admin' ? caller.tenant_id : hotel_id
  const roleTenantId = ['hotel_admin', 'staff'].includes(role) ? effectiveHotelId : null

  // ── Check if user already exists ──────────────────────────────────────────
  const { data: existingProfiles } = await adminClient
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .limit(1)

  // Enforce plan staff limit when adding a new staff member
  if (role === 'staff' && effectiveHotelId) {
    const { data: hotelPlan } = await adminClient
      .from('hotels').select('plan:plans(max_staff, name)').eq('id', effectiveHotelId).single()
    const { count: staffCount } = await adminClient
      .from('staff').select('*', { count: 'exact', head: true })
      .eq('hotel_id', effectiveHotelId).eq('is_active', true)
    const maxStaff = (hotelPlan?.plan as { max_staff?: number } | null)?.max_staff ?? 0
    const planName = (hotelPlan?.plan as { name?: string }      | null)?.name ?? 'current'

    if (limitReached(maxStaff, staffCount ?? 0)) {
      return NextResponse.json({
        error: `Staff limit reached. Your ${planName} plan allows up to ${maxStaff} active staff members. Upgrade your plan to add more.`,
      }, { status: 403 })
    }
  }

  if (existingProfiles && existingProfiles.length > 0) {
    const existingUserId = existingProfiles[0].id

    // Block if they already have this role at this tenant
    let dupQ = adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', existingUserId)
      .eq('role', role)

    if (roleTenantId) {
      dupQ = dupQ.eq('tenant_id', roleTenantId)
    } else {
      dupQ = dupQ.is('tenant_id', null)
    }

    const { data: dupRole } = await dupQ.maybeSingle()
    if (dupRole) {
      return NextResponse.json(
        { error: `This user already has the ${role} role${effectiveHotelId ? ' at this hotel' : ''}.` },
        { status: 409 },
      )
    }

    // Existing user: add the new role without touching their password or primary role
    const { error: roleInsertError } = await adminClient.from('user_roles').insert({
      user_id: existingUserId,
      role,
      tenant_id: roleTenantId,
    })
    if (roleInsertError) return NextResponse.json({ error: roleInsertError.message }, { status: 400 })

    if (role === 'staff' && effectiveHotelId) {
      await adminClient.from('staff').insert({
        hotel_id:    effectiveHotelId,
        user_id:     existingUserId,
        department:  department  || 'General',
        position:    position    || 'Staff',
        permissions: permissions || [],
        is_active:   true,
        status:      'active',
        shift:       shift  || null,
        salary:      parseFloat(salary) || 0,
      })
    }

    return NextResponse.json({
      success: true,
      userId: existingUserId,
      note: 'Role added to existing account. The user can now select this role on their next login.',
    })
  }

  // ── New user ───────────────────────────────────────────────────────────────
  let createdUserId: string
  let pendingEmail: { subject: string; html: string } | null = null

  if (role === 'customer') {
    const { data: invite, error: inviteError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name, role: 'customer' },
        redirectTo: `${getSiteUrl()}/auth/callback`,
      },
    })
    const inviteUrl = invite?.properties?.action_link
    if (inviteError || !inviteUrl || !invite?.user) {
      return NextResponse.json({ error: inviteError?.message || 'Failed to generate invite link' }, { status: 400 })
    }
    createdUserId = invite.user.id
    pendingEmail = customerInviteTemplate(full_name, inviteUrl)
  } else {
    if (!password) {
      return NextResponse.json({ error: 'Password is required for non-customer roles' }, { status: 400 })
    }
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })
    createdUserId = created.user.id
    pendingEmail = staffWelcomeTemplate({
      fullName: full_name,
      email,
      tempPassword: password,
      role,
      loginUrl: `${getSiteUrl()}/login`,
    })
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: createdUserId,
    email,
    full_name,
    role,
    tenant_id: roleTenantId,
    country: country || null,
    city: city || null,
    address: address || null,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  // Insert into user_roles (trigger may have created a row with tenant_id=null; update it)
  await adminClient.from('user_roles')
    .update({ tenant_id: roleTenantId })
    .eq('user_id', createdUserId)
    .eq('role', role)
    .is('tenant_id', null)

  // Insert if it didn't exist yet (e.g. trigger hasn't fired for invite flow)
  await adminClient.from('user_roles').insert({
    user_id: createdUserId,
    role,
    tenant_id: roleTenantId,
  }).then(({ error }) => {
    if (error && error.code !== '23505') console.error('user_roles insert:', error)
  })

  if (role === 'staff' && effectiveHotelId) {
    const { error: staffError } = await adminClient.from('staff').insert({
      hotel_id:    effectiveHotelId,
      user_id:     createdUserId,
      department:  department  || 'General',
      position:    position    || 'Staff',
      permissions: permissions || [],
      is_active:   true,
      status:      'active',
      shift:       shift  || null,
      salary:      parseFloat(salary) || 0,
    })
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 })
  }

  let emailWarning: string | undefined
  if (pendingEmail) {
    try {
      await sendEmail({ to: email, subject: pendingEmail.subject, html: pendingEmail.html })
    } catch (emailError) {
      const reason = emailError instanceof Error ? emailError.message : String(emailError)
      console.error('Failed to send account email:', reason)
      emailWarning = `Account created, but the notification email could not be sent: ${reason}`
    }
  }

  return NextResponse.json({ success: true, userId: createdUserId, ...(emailWarning ? { emailWarning } : {}) })
}
