import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { nameSchema, phoneSchema } from '@/lib/validation'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
]

/** The caller must be an admin of the hotel the staff member belongs to. */
async function authorise(staffId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: caller } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!caller || !['super_admin', 'hotel_admin'].includes(caller.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const admin = await createAdminClient()
  const { data: member } = await admin
    .from('staff').select('id, hotel_id, user_id').eq('id', staffId).single()
  if (!member) return { error: NextResponse.json({ error: 'Staff member not found' }, { status: 404 }) }

  if (caller.role !== 'super_admin' && member.hotel_id !== caller.tenant_id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { admin, member, caller, user }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const auth = await authorise(id)
  if (auth.error) return auth.error
  const { admin, member } = auth

  const body = await request.json().catch(() => ({}))
  const { full_name, phone, department, position, permissions, is_active } = body

  // ── Staff record ──────────────────────────────────────────────────
  const staffUpdates: Record<string, unknown> = {}

  if (department !== undefined) {
    if (typeof department !== 'string' || !department.trim()) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 })
    }
    staffUpdates.department = department.trim()
  }

  if (position !== undefined) {
    const trimmed = typeof position === 'string' ? position.trim() : ''
    if (!trimmed || !/[A-Za-z]/.test(trimmed)) {
      return NextResponse.json({ error: 'Position must be a descriptive name' }, { status: 400 })
    }
    staffUpdates.position = trimmed
  }

  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be a list' }, { status: 400 })
    }
    const cleaned = Array.from(new Set(permissions.filter(
      (p: unknown): p is string => typeof p === 'string' && ALLOWED_PERMISSIONS.includes(p),
    )))
    if (!cleaned.length) {
      return NextResponse.json({ error: 'Give the staff member at least one permission' }, { status: 400 })
    }
    staffUpdates.permissions = cleaned
  }

  if (is_active !== undefined) staffUpdates.is_active = !!is_active

  if (Object.keys(staffUpdates).length) {
    const { error } = await admin.from('staff').update(staffUpdates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // ── Their profile ─────────────────────────────────────────────────
  // Hotel admins can read but not write another user's profile under RLS, so
  // the name and phone are updated here with the service-role client.
  const profileUpdates: Record<string, unknown> = {}

  if (full_name !== undefined) {
    const check = nameSchema.safeParse(full_name)
    if (!check.success) return NextResponse.json({ error: check.error.issues[0].message }, { status: 400 })
    profileUpdates.full_name = check.data
  }
  if (phone !== undefined && phone !== null && phone !== '') {
    const check = phoneSchema.safeParse(phone)
    if (!check.success) return NextResponse.json({ error: check.error.issues[0].message }, { status: 400 })
    profileUpdates.phone = check.data
  } else if (phone === '' || phone === null) {
    profileUpdates.phone = null
  }

  if (Object.keys(profileUpdates).length) {
    const { error } = await admin.from('profiles').update(profileUpdates).eq('id', member.user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  const auth = await authorise(id)
  if (auth.error) return auth.error
  const { admin, member, user } = auth

  // An admin removing themselves would lock the hotel out of its own dashboard.
  if (member.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })
  }

  // Deleting the login cascades to the profile and the staff row, so the
  // account can't linger with a dashboard it no longer belongs to. If that
  // fails (a record still references them), nothing has changed yet.
  const { error: authError } = await admin.auth.admin.deleteUser(member.user_id)
  if (authError) {
    // Fall back to taking them off the roster and switching the login off.
    const { error: staffError } = await admin.from('staff').delete().eq('id', id)
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 })
    return NextResponse.json({
      success: true,
      warning: 'Staff record removed. Their login could not be deleted because other records reference it.',
    })
  }

  return NextResponse.json({ success: true })
}
