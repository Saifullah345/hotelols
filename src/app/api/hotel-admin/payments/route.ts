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

  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id, booking_id, amount, currency, status, payment_method,
      invoice_number, paid_at, created_at,
      booking:bookings(
        check_in, check_out, guest_name, guest_phone, total_amount, room_ids,
        room:rooms(room_number),
        user:profiles(full_name, email)
      )
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    payments: payments ?? [],
    hasMore: (payments ?? []).length === PAGE_SIZE,
  })
}
