import { createClient } from '@/lib/supabase/server'
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
    .select('id, price_per_night, hotel_id')
    .eq('id', room_id)
    .single()

  if (!room || room.hotel_id !== hotelId) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', room_id)
    .in('status', ['confirmed', 'checked_in'])
    .or(`check_in.lte.${check_out},check_out.gte.${check_in}`)

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

  const { data: booking, error } = await supabase.from('bookings').insert({
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

  // Determine payment method and status
  const finalPaymentMethod = payment_method ?? (source === 'online' ? 'online' : 'cash')
  const isPaid = payment_collected !== false  // default true for walk-in/phone/whatsapp
  const paymentStatus = source === 'online' ? 'pending' : (isPaid ? 'completed' : 'pending')

  const { error: paymentError } = await supabase.from('payments').insert({
    booking_id: booking.id,
    hotel_id: hotelId,
    user_id: guest_user_id ?? null,
    amount: total_amount,
    currency,
    status: paymentStatus,
    payment_method: finalPaymentMethod,
    payment_notes: payment_notes ?? null,
    paid_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
  })

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  return NextResponse.json(booking, { status: 201 })
}
