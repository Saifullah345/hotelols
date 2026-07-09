import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// Mirrors staff/bookings/page.tsx: staff have no RLS read access to `profiles`,
// so the usual `user:profiles(...)` join comes back empty for them. Resolve
// registered guests' names with the service-role client, scoped to this hotel's
// bookings, and expose the merged result as JSON for the mobile app.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (profile?.role !== 'staff' || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('bookings')
    .select('*, room:rooms(room_number, room_type:room_types(name))')
    .eq('hotel_id', profile.tenant_id)
    .order('check_in', { ascending: true })
  if (status) query = query.eq('status', status)

  const { data: bookings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const guestIds = Array.from(new Set((bookings ?? []).map(b => b.user_id).filter((id): id is string => !!id)))
  let guestMap: Record<string, { full_name?: string; email?: string }> = {}
  if (guestIds.length) {
    const admin = await createAdminClient()
    const { data: guests } = await admin.from('profiles').select('id, full_name, email').in('id', guestIds)
    guestMap = Object.fromEntries((guests ?? []).map(g => [g.id, g]))
  }

  const result = (bookings ?? []).map(b => ({
    ...b,
    guest: b.user_id ? guestMap[b.user_id] ?? null : null,
  }))

  return NextResponse.json(result)
}
