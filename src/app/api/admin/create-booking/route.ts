import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
  if (!hotelId) return NextResponse.json({ error: 'No hotel assigned to your account' }, { status: 400 })

  const body = await request.json()
  const {
    guest_user_id,
    guest_name,
    guest_phone,
    room_id,
    check_in,
    check_out,
    adults,
    children,
    special_requests,
    status,
    source = 'walk_in',
    payment_method,
    payment_collected,
    payment_notes,
    advance_amount,
  } = body

  if (!guest_user_id && !guest_name) {
    return NextResponse.json({ error: 'Provide guest_user_id or guest_name' }, { status: 400 })
  }

  if (!room_id || !check_in || !check_out) {
    return NextResponse.json({ error: 'room_id, check_in and check_out are required' }, { status: 400 })
  }

  const checkInDate = new Date(check_in)
  const checkOutDate = new Date(check_out)
  if (checkOutDate <= checkInDate) {
    return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('id, price_per_night, hotel_id, max_adults, max_children, capacity')
    .eq('id', room_id)
    .single()

  if (!room || room.hotel_id !== hotelId) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if ((adults ?? 1) > room.max_adults || (children ?? 0) > room.max_children) {
    return NextResponse.json(
      { error: `This room allows up to ${room.max_adults} adult${room.max_adults !== 1 ? 's' : ''} and ${room.max_children} child${room.max_children !== 1 ? 'ren' : ''}` },
      { status: 400 },
    )
  }

  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', room_id)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'Room is not available for the selected dates' }, { status: 409 })
  }

  // Get hotel currency
  const { data: hotel } = await supabase
    .from('hotels')
    .select('currency')
    .eq('id', hotelId)
    .single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000)
  const total_amount = nights * (room.price_per_night ?? 0)
  const guests = (adults ?? 1) + (children ?? 0)

  // Determine payment method and status up front so an invalid advance
  // amount fails before we create the booking, not after.
  const finalPaymentMethod = payment_method ?? (source === 'online' ? 'online' : 'cash')
  const isPaid = payment_collected !== false  // default true for walk-in/phone/whatsapp
  const paymentStatus = source === 'online' ? 'pending' : (isPaid ? 'completed' : 'pending')

  let paymentAmount = total_amount
  if (paymentStatus === 'completed' && advance_amount != null) {
    const advance = Number(advance_amount)
    if (!Number.isFinite(advance) || advance <= 0 || advance > total_amount) {
      return NextResponse.json(
        { error: `Advance amount must be greater than 0 and no more than the total (${total_amount})` },
        { status: 400 },
      )
    }
    paymentAmount = advance
  }

  // Use service-role client for writes — walk-in bookings have user_id = null
  // which the per-user RLS policy would reject on the payments insert.
  const admin = await createAdminClient()

  const { data: booking, error } = await admin.from('bookings').insert({
    hotel_id: hotelId,
    room_id,
    user_id: guest_user_id ?? null,
    guest_name: guest_user_id ? null : (guest_name ?? null),
    guest_phone: guest_user_id ? null : (guest_phone ?? null),
    check_in,
    check_out,
    guests,
    adults: adults ?? 1,
    children: children ?? 0,
    special_requests: special_requests ?? null,
    status: status ?? 'confirmed',
    source,
    total_amount,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: payment, error: paymentError } = await admin.from('payments').insert({
    booking_id: booking.id,
    hotel_id: hotelId,
    user_id: guest_user_id ?? null,
    amount: paymentAmount,
    currency,
    status: paymentStatus,
    payment_method: finalPaymentMethod,
    payment_notes: payment_notes ?? null,
    paid_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
  }).select('id').single()

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  return NextResponse.json({ ...booking, payment_id: payment?.id }, { status: 201 })
}
