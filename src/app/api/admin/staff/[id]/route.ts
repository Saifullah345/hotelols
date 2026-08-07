import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripHtml } from '@/lib/sanitize'
import { isValidEmail } from '@/lib/validation'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_SHIFTS   = ['Morning', 'Evening', 'Night']
const ALLOWED_STATUSES = ['active', 'on_leave', 'inactive']

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
  const { name, email, phone, department, position, shift, salary, status } = body

  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    const cleanName = stripHtml(typeof name === 'string' ? name : '').trim()
    if (!cleanName)            return NextResponse.json({ error: 'Name is required' },                    { status: 400 })
    if (cleanName.length < 2)  return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    if (cleanName.length > 50) return NextResponse.json({ error: 'Name cannot exceed 50 characters' },   { status: 400 })
    updates.name = cleanName
  }

  if (email !== undefined) {
    const cleanEmail = stripHtml(typeof email === 'string' ? email : '').trim()
    if (!cleanEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!isValidEmail(cleanEmail))
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    updates.email = cleanEmail
  }

  if (phone !== undefined)
    updates.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null

  if (department !== undefined) {
    const cleanDept = stripHtml(typeof department === 'string' ? department : '').trim()
    if (!cleanDept)
      return NextResponse.json({ error: 'Department is required' }, { status: 400 })
    updates.department = cleanDept
  }

  if (position !== undefined) {
    const trimmed = stripHtml(typeof position === 'string' ? position : '').trim()
    if (!trimmed)             return NextResponse.json({ error: 'Position is required' },                    { status: 400 })
    if (trimmed.length > 50)  return NextResponse.json({ error: 'Position cannot exceed 50 characters' },   { status: 400 })
    updates.position = trimmed
  }

  if (shift !== undefined)
    updates.shift = ALLOWED_SHIFTS.includes(shift) ? shift : null

  if (salary !== undefined) {
    const n = parseFloat(salary)
    updates.salary = isNaN(n) || n < 0 ? 0 : n
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    updates.status    = status
    updates.is_active = status !== 'inactive'
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.from('staff').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  const auth = await authorise(id)
  if (auth.error) return auth.error
  const { admin, member, user } = auth

  if (member.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })
  }

  const { error: authError } = await admin.auth.admin.deleteUser(member.user_id)
  if (authError) {
    const { error: staffError } = await admin.from('staff').delete().eq('id', id)
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 400 })
    return NextResponse.json({
      success: true,
      warning: 'Staff record removed. Their login could not be deleted because other records reference it.',
    })
  }

  return NextResponse.json({ success: true })
}
