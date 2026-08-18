import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { blockIfExpired } from '@/lib/subscription-guard'

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

  // The dashboard already hides itself behind the plan gate; this is what
  // actually stops a stale tab or a direct request from operating a hotel
  // with no running subscription.
  const blocked = await blockIfExpired(hotelId)
  if (blocked) return blocked

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
    .select('id, hotel_id, user_id, total_amount, status')
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

  const now = new Date().toISOString()
  const totalAmount = (booking as { total_amount: number }).total_amount

  // Get ALL existing payments for this booking
  const { data: existingPayments } = await admin
    .from('payments')
    .select('id, status, amount')
    .eq('booking_id', booking_id)

  const completedTotal = (existingPayments ?? [])
    .filter((p: { status: string; amount: number }) => p.status === 'completed')
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

  const pendingPayment = (existingPayments ?? []).find(
    (p: { status: string }) => p.status === 'pending'
  )

  // Balance remaining after all completed payments
  const balanceAmount = totalAmount - completedTotal

  if (balanceAmount <= 0) {
    return NextResponse.json({ error: 'This booking is already fully paid' }, { status: 400 })
  }

  let paymentId: string | undefined

  if (pendingPayment) {
    // Update the pending record to completed for the remaining balance
    const { error } = await admin
      .from('payments')
      .update({
        amount: balanceAmount,
        status: 'completed',
        payment_method,
        payment_notes: payment_notes ?? null,
        paid_at: now,
      })
      .eq('id', (pendingPayment as { id: string }).id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    paymentId = (pendingPayment as { id: string }).id
  } else {
    // Insert a new payment row — either the first full payment or a balance
    // instalment after an advance was already collected.
    const { data: created, error } = await admin.from('payments').insert({
      booking_id,
      hotel_id: hotelId,
      user_id: (booking as { user_id?: string | null }).user_id ?? null,
      amount: balanceAmount,
      currency,
      status: 'completed',
      payment_method,
      payment_notes: payment_notes ?? null,
      paid_at: now,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    paymentId = created?.id
  }

  // If the booking was still pending, confirming a payment means the advance
  // has been received — automatically move it to confirmed.
  if ((booking as { status: string }).status === 'pending') {
    await admin.from('bookings').update({ status: 'confirmed' }).eq('id', booking_id)
  }

  return NextResponse.json({ success: true, paymentId })
}
