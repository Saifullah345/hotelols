import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called on Check-In page load — marks any confirmed booking whose check-in
// date has already passed (and was never checked in) as no_show.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('bookings')
    .update({ status: 'no_show' })
    .in('status', ['pending', 'confirmed'])
    .lt('check_in', today)   // check-in date already passed
    .select('id')

  // Scope to hotel admin's own hotel
  if (profile.role !== 'super_admin' && profile.tenant_id) {
    query = query.eq('hotel_id', profile.tenant_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ marked: data?.length ?? 0 })
}
