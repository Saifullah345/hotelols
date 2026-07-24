import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Auth check using the user's session (respects RLS)
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

  const hotelId = profile.tenant_id
  if (!hotelId) return NextResponse.json({ error: 'No hotel assigned' }, { status: 400 })

  const body = await request.json()
  const { booking_id, payment_method, payment_status, payment_notes } = body

  if (!booking_id || !payment_method) {
    return NextResponse.json({ error: 'booking_id and payment_method are required' }, { status: 400 })
  }

  // Use service-role client for writes — payment inserts for walk-in guests
  // have user_id = null which the per-user RLS policy would reject.
  const admin = await createAdminClient()

  // Verify booking belongs to this hotel
  const { data: booking } = await admin
    .from('bookings')
    .select('id, hotel_id, user_id, total_amount')
    .eq('id', booking_id)
    .single()

  if (!booking || booking.hotel_id !== hotelId) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Get hotel currency
  const { data: hotel } = await admin
    .from('hotels')
    .select('currency')
    .eq('id', hotelId)
    .single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  const finalStatus = payment_status ?? 'completed'
  const isCompleted = finalStatus === 'completed'
  const now = new Date().toISOString()

  // Check if a payment already exists for this booking
  const { data: existing } = await admin
    .from('payments')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  let paymentId = existing?.id

  if (existing) {
    const { error } = await admin
      .from('payments')
      .update({
        // Settle to the full total — the existing row may only cover an
        // advance/partial amount taken at booking time.
        amount: (booking as { total_amount: number }).total_amount,
        status: finalStatus,
        payment_method,
        payment_notes: payment_notes ?? null,
        paid_at: isCompleted ? now : null,
      })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { data: created, error } = await admin.from('payments').insert({
      booking_id,
      hotel_id: hotelId,
      user_id: (booking as { user_id?: string | null }).user_id ?? null,
      amount: (booking as { total_amount: number }).total_amount,
      currency,
      status: finalStatus,
      payment_method,
      payment_notes: payment_notes ?? null,
      paid_at: isCompleted ? now : null,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    paymentId = created?.id
  }

  return NextResponse.json({ success: true, paymentId })
}
