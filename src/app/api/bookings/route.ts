import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { isProfileComplete, missingProfileFields, PROFILE_INCOMPLETE } from '@/lib/profile'
import { blockIfExpired } from '@/lib/subscription-guard'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('bookings')
    .select('*, user:profiles(full_name, email), room:rooms(room_number, room_type:room_types(name)), hotel:hotels(name)')
    .order('created_at', { ascending: false })

  if (profile?.role === 'customer') {
    query = query.eq('user_id', user.id)
  } else if (['hotel_admin', 'staff'].includes(profile?.role) && profile?.tenant_id) {
    query = query.eq('hotel_id', profile.tenant_id)
  }

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only customer accounts can create bookings
  const { data: callerProfile } = await supabase
    .from('profiles').select('role, full_name, phone').eq('id', user.id).single()
  if (callerProfile?.role && callerProfile.role !== 'customer') {
    return NextResponse.json(
      { error: 'Admin and staff accounts cannot make bookings. Please use a customer account.' },
      { status: 403 },
    )
  }

  // The hotel has to be able to reach the guest. Enforced here as well as in the
  // UI, so the rule holds however the booking was submitted.
  if (!isProfileComplete(callerProfile)) {
    return NextResponse.json(
      {
        error: `Add your ${missingProfileFields(callerProfile).join(' and ')} to your profile before booking.`,
        code: PROFILE_INCOMPLETE,
      },
      { status: 422 },
    )
  }

  const body = await request.json()
  const { check_in, check_out, room_id, room_ids, hotel_id, guests, adults, children, special_requests } = body

  // Several rooms booked in one go stay ONE reservation — `room_ids` carries
  // them all and the `booking_room_ids_sync` trigger keeps `room_id` in step.
  const roomIds: string[] = Array.from(
    new Set<string>(
      (Array.isArray(room_ids) && room_ids.length ? room_ids : [room_id]).filter(
        (r: unknown): r is string => typeof r === 'string' && r.length > 0,
      ),
    ),
  )

  if (!roomIds.length || !hotel_id || !check_in || !check_out) {
    return NextResponse.json(
      { error: 'At least one room, hotel, check-in and check-out are required' },
      { status: 400 },
    )
  }
  if (new Date(check_out) <= new Date(check_in)) {
    return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  }

  // A hotel whose plan has lapsed can't take bookings, even from a page that
  // was already open when it expired.
  const expired = await blockIfExpired(hotel_id)
  if (expired) {
    return NextResponse.json(
      { error: 'This hotel is not accepting bookings right now.' },
      { status: 409 },
    )
  }

  // `overlaps` matches a room wherever it appears on another booking, not just
  // as that booking's primary room.
  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .overlaps('room_ids', roomIds)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (conflicting && conflicting.length > 0) {
    return NextResponse.json(
      { error: `${roomIds.length > 1 ? 'One or more rooms are' : 'Room is'} not available for selected dates` },
      { status: 409 },
    )
  }

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, hotel_id, status, price_per_night, room_number, capacity, max_adults, max_children')
    .in('id', roomIds)

  if (!rooms || rooms.length !== roomIds.length) {
    return NextResponse.json({ error: 'One or more rooms not found' }, { status: 404 })
  }
  if (rooms.some(r => r.hotel_id !== hotel_id)) {
    return NextResponse.json({ error: 'One or more rooms not found' }, { status: 404 })
  }
  if (rooms.some(r => r.status !== 'available')) {
    return NextResponse.json({ error: 'One or more rooms are no longer bookable' }, { status: 409 })
  }

  // Capacity guard — the party must fit within the booked rooms' combined capacity
  const adultCount = Math.max(1, Number(adults ?? guests ?? 1))
  const childCount = Math.max(0, Number(children ?? 0))
  const partySize  = adultCount + childCount
  const totalCapacity = rooms.reduce(
    (sum, r) => sum + (r.capacity ?? ((r.max_adults ?? 0) + (r.max_children ?? 0))), 0,
  )
  if (totalCapacity > 0 && partySize > totalCapacity) {
    return NextResponse.json(
      { error: `${roomIds.length > 1 ? 'These rooms accommodate' : 'This room accommodates'} up to ${totalCapacity} guest(s).` },
      { status: 400 },
    )
  }

  const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000)
  const total_amount = nights * rooms.reduce((sum, r) => sum + Number(r.price_per_night ?? 0), 0)

  // Built field by field rather than spreading the request body — a guest must
  // not be able to post their own `status` or `total_amount`.
  const { data: booking, error } = await supabase.from('bookings').insert({
    user_id:  user.id,
    hotel_id,
    room_id:  roomIds[0],
    room_ids: roomIds,
    check_in,
    check_out,
    adults:   adultCount,
    children: childCount,
    guests:   partySize,
    special_requests: special_requests ?? null,
    total_amount,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: paymentError } = await supabase.from('payments').insert({
    booking_id: booking.id,
    hotel_id,
    user_id: user.id,
    amount: total_amount,
    currency: 'USD',
    status: 'pending',
    payment_method: 'online',
  })

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  // Notify the hotel's admins about the new booking. Best-effort and done with
  // the service-role client, since a customer can't write notifications to
  // another user under RLS. A failure here must not fail the booking.
  try {
    const admin = await createAdminClient()
    const { data: admins } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'hotel_admin')
      .eq('tenant_id', hotel_id)

    if (admins && admins.length > 0) {
      const { data: guest } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
      const guestName = guest?.full_name?.trim() || 'A guest'
      const roomLabel = rooms.length > 1
        ? `${rooms.length} rooms (${rooms.map(r => r.room_number).join(', ')})`
        : `Room ${rooms[0].room_number}`
      const message = `${guestName} booked ${roomLabel} for ${nights} night${nights === 1 ? '' : 's'} (${check_in} → ${check_out}).`

      await admin.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          hotel_id,
          title: 'New booking received',
          message,
          type: 'booking' as const,
          data: { booking_id: booking.id },
        })),
      )
    }
  } catch (notifyError) {
    console.error('Failed to create booking notifications:', notifyError)
  }

  return NextResponse.json(booking, { status: 201 })
}
