import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Customers have no RLS UPDATE policy on bookings (only staff/admins do), so a
// client-side `update({ status: 'cancelled' })` silently affects 0 rows and
// looks like it succeeded. Cancellation therefore has to run server-side: we
// verify ownership + that the booking is still pending, then update with the
// service-role client.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : ''
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, user_id, status')
    .eq('id', bookingId)
    .single()
  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Only the guest who made the booking can cancel it here.
  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Guests may only cancel while the booking is still pending. Confirmed or
  // checked-in stays must be handled by the hotel.
  if (booking.status !== 'pending') {
    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: true, status: 'cancelled' })
    }
    return NextResponse.json(
      { error: 'This booking can no longer be cancelled. Please contact the hotel.' },
      { status: 409 },
    )
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'Cancelled by guest' })
    .eq('id', bookingId)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // Void the unpaid payment so it doesn't linger as "pending" on a dead booking.
  await admin
    .from('payments')
    .update({ status: 'failed' })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')

  return NextResponse.json({ success: true, status: 'cancelled' })
}
