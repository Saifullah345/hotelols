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
    room_ids: rawRoomIds,
    room_id: singleRoomId,   // backward-compat: single room_id still works
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

  // Normalise to an array of room IDs
  const roomIds: string[] =
    Array.isArray(rawRoomIds) && rawRoomIds.length > 0
      ? rawRoomIds
      : singleRoomId
      ? [singleRoomId]
      : []

  if (!guest_user_id && !guest_name) {
    return NextResponse.json({ error: 'Provide guest_user_id or guest_name' }, { status: 400 })
  }
  if (roomIds.length === 0 || !check_in || !check_out) {
    return NextResponse.json({ error: 'At least one room, check_in and check_out are required' }, { status: 400 })
  }

  const checkInDate  = new Date(check_in)
  const checkOutDate = new Date(check_out)
  if (checkOutDate <= checkInDate) {
    return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  }

  // Fetch all selected rooms in one query
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, price_per_night, hotel_id, max_adults, max_children, capacity')
    .in('id', roomIds)

  if (!rooms || rooms.length !== roomIds.length) {
    return NextResponse.json({ error: 'One or more rooms not found' }, { status: 404 })
  }
  if (rooms.some((r: { hotel_id: string }) => r.hotel_id !== hotelId)) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  // Check conflicts for all rooms at once — overlaps() matches any room on an
  // existing booking, not just its primary one
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, room_ids')
    .overlaps('room_ids', roomIds)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'One or more rooms are not available for the selected dates' }, { status: 409 })
  }

  // Hotel currency
  const { data: hotel } = await supabase
    .from('hotels')
    .select('currency')
    .eq('id', hotelId)
    .single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  const nights       = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000)
  const total_amount = nights * rooms.reduce((sum: number, r: { price_per_night: number }) => sum + (r.price_per_night ?? 0), 0)
  const guests       = (adults ?? 1) + (children ?? 0)

  const finalPaymentMethod = payment_method ?? (source === 'online' ? 'online' : 'cash')
  const isPaid       = payment_collected !== false
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

  const admin = await createAdminClient()

  // Create ONE booking — room_id = primary, room_ids = all
  const { data: booking, error } = await admin.from('bookings').insert({
    hotel_id:         hotelId,
    room_id:          roomIds[0],
    room_ids:         roomIds,
    user_id:          guest_user_id ?? null,
    guest_name:       guest_user_id ? null : (guest_name ?? null),
    guest_phone:      guest_user_id ? null : (guest_phone ?? null),
    check_in,
    check_out,
    guests,
    adults:           adults ?? 1,
    children:         children ?? 0,
    special_requests: special_requests ?? null,
    status:           status ?? 'confirmed',
    source,
    total_amount,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: payment, error: paymentError } = await admin.from('payments').insert({
    booking_id:     booking.id,
    hotel_id:       hotelId,
    user_id:        guest_user_id ?? null,
    amount:         paymentAmount,
    currency,
    status:         paymentStatus,
    payment_method: finalPaymentMethod,
    payment_notes:  payment_notes ?? null,
    paid_at:        paymentStatus === 'completed' ? new Date().toISOString() : null,
  }).select('id').single()

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  return NextResponse.json({ ...booking, payment_id: payment?.id }, { status: 201 })
}
