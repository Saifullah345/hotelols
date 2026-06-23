import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/supabase/env'
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
  const { full_name, role, hotel_id, department, position, permissions } = body
  const password = body.password
  // Normalise so duplicate detection is case-insensitive and matches how
  // Supabase Auth stores emails.
  const email: string = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'full_name, email, and role are required' }, { status: 400 })
  }

  // There is exactly one super admin per platform — created directly in Supabase.
  if (role === 'super_admin') {
    return NextResponse.json(
      { error: 'Super admin accounts cannot be created here. Create one directly in Supabase.' },
      { status: 403 },
    )
  }

  // hotel_admin can only add staff to their own hotel
  if (caller.role === 'hotel_admin') {
    if (role !== 'staff') {
      return NextResponse.json({ error: 'Hotel admins can only add staff members' }, { status: 403 })
    }
  }

  const adminClient = await createAdminClient()

  // One email = one account. Don't let the same address be reused for a
  // different account type (e.g. a customer email reused to make a staff login).
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id, role')
    .ilike('email', email)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: `An account with this email already exists (role: ${existing[0].role}). Use a different email.` },
      { status: 409 },
    )
  }
  const effectiveHotelId = caller.role === 'hotel_admin' ? caller.tenant_id : hotel_id

  let createdUserId: string

  if (role === 'customer') {
    // Send invite email — customer sets their own password and verifies email on first login.
    // redirectTo forces the link back to the deployed app (must be in Supabase's
    // Auth → URL Configuration → Redirect URLs allow-list).
    const { data: invite, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: 'customer' },
      redirectTo: `${getSiteUrl()}/auth/callback`,
    })
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })
    createdUserId = invite.user.id
  } else {
    if (!password) {
      return NextResponse.json({ error: 'Password is required for non-customer roles' }, { status: 400 })
    }
    // Admin-created users have email auto-confirmed — no verification needed
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })
    createdUserId = created.user.id
  }

  // Update profile (trigger may have created it with defaults already)
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: createdUserId,
    email,
    full_name,
    role,
    tenant_id: ['hotel_admin', 'staff'].includes(role) ? effectiveHotelId : null,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

  // Create staff record when role is staff
  if (role === 'staff' && effectiveHotelId) {
    const { error: staffError } = await adminClient.from('staff').insert({
      hotel_id: effectiveHotelId,
      user_id: createdUserId,
      department: department || 'General',
      position: position || 'Staff',
      permissions: permissions || [],
      is_active: true,
    })
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: createdUserId })
}
