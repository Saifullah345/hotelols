import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 50

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!caller || !['super_admin', 'hotel_admin', 'hotel_staff'].includes(caller.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const hotelId = caller.tenant_id as string | null
  if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id, created_at, check_in, check_out, status, total_amount, source,
      adults, children, special_requests, guest_name, guest_phone,
      user_id, room_id, room_ids,
      user:profiles(full_name, email, avatar_url),
      room:rooms(id, room_number, name, price_per_night, capacity, room_type:room_types(name))
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    bookings: bookings ?? [],
    hasMore: (bookings ?? []).length === PAGE_SIZE,
  })
}
