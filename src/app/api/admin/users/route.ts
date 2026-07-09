import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// Mirrors the data super-admin/users/page.tsx assembles server-side, exposed as
// JSON so the mobile app (no Server Components) can render the same list.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = await createAdminClient()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, tenant_id, city, country')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const confirmedById = new Map((authList?.users ?? []).map(u => [u.id, Boolean(u.email_confirmed_at)]))
  const suspendedById = new Map((authList?.users ?? []).map(u => [u.id, Boolean(u.banned_until)]))

  const tenantIds = Array.from(new Set((users ?? []).map(u => u.tenant_id).filter(Boolean) as string[]))
  const hotelNameById = new Map<string, string>()
  if (tenantIds.length > 0) {
    const { data: hotels } = await supabase.from('hotels').select('id, name').in('id', tenantIds)
    for (const hotel of hotels ?? []) hotelNameById.set(hotel.id, hotel.name)
  }

  const result = (users ?? []).map(u => ({
    ...u,
    is_verified: confirmedById.get(u.id) ?? false,
    is_suspended: suspendedById.get(u.id) ?? false,
    hotel_name: u.tenant_id ? hotelNameById.get(u.tenant_id) ?? null : null,
  }))

  return NextResponse.json(result)
}
