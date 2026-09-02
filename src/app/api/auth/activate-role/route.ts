import { createClient } from '@/lib/supabase/server'
import { ROLE_COOKIE, TENANT_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const body = await request.json().catch(() => ({}))
  const { role, tenantId = null } = body

  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 })

  // Verify this (role, tenant) exists for the user before setting the cookie.
  // No `.eq('user_id', ...)` filter: the own_roles_read RLS policy is
  // `auth.uid() = user_id`, so this query can only ever see the caller's own
  // rows. Not needing the user id up front is what lets it run alongside the
  // auth check rather than waiting for it — two round-trips in the time of one.
  let q = supabase
    .from('user_roles')
    .select('id')
    .eq('role', role)

  if (tenantId) {
    q = q.eq('tenant_id', tenantId)
  } else {
    q = q.is('tenant_id', null)
  }

  const [{ data: { user } }, { data: found }] = await Promise.all([
    supabase.auth.getUser(),
    q.maybeSingle(),
  ])

  // Still fails closedand in the same order as before: no valid session is
  // Unauthorized, a session without this role is Forbidden.
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!found) {
    return NextResponse.json({ error: 'Role not available for this account' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ROLE_COOKIE, role, SESSION_COOKIE_OPTS)
  if (tenantId) {
    res.cookies.set(TENANT_COOKIE, tenantId, SESSION_COOKIE_OPTS)
  } else {
    res.cookies.delete(TENANT_COOKIE)
  }
  return res
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ROLE_COOKIE)
  res.cookies.delete(TENANT_COOKIE)
  return res
}
