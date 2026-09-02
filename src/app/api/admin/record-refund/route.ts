import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!profile || !['super_admin', 'hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hotelId = profile.tenant_id
  if (!hotelId) return NextResponse.json({ error: 'No hotel assigned' }, { status: 400 })

  const body = await request.json()
  const { booking_id, amount, payment_method } = body

  if (!booking_id || !amount || !payment_method) {
    return NextResponse.json({ error: 'booking_id, amountand payment_method are required' }, { status: 400 })
  }

  const refundAmount = Number(amount)
  if (isNaN(refundAmount) || refundAmount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('id, hotel_id, user_id')
    .eq('id', booking_id)
    .single()

  if (!booking || (booking as { hotel_id: string }).hotel_id !== hotelId) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const { data: hotel } = await admin.from('hotels').select('currency').eq('id', hotelId).single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  const { error } = await admin.from('payments').insert({
    booking_id,
    hotel_id:       hotelId,
    user_id:        (booking as { user_id?: string | null }).user_id ?? null,
    amount:         refundAmount,
    currency,
    status:         'refunded',
    payment_method,
    paid_at:        new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
