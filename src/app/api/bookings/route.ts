import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
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

  const body = await request.json()
  const { check_in, check_out, room_id, hotel_id, guests } = body

  const { data: conflicting } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', room_id)
    .in('status', ['confirmed', 'checked_in'])
    .or(`check_in.lte.${check_out},check_out.gte.${check_in}`)

  if (conflicting && conflicting.length > 0) {
    return NextResponse.json({ error: 'Room is not available for selected dates' }, { status: 409 })
  }

  const { data: room } = await supabase.from('rooms').select('price_per_night, room_number').eq('id', room_id).single()
  const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000)
  const total_amount = nights * (room?.price_per_night ?? 0)

  const { data: booking, error } = await supabase.from('bookings').insert({
    ...body,
    user_id: user.id,
    hotel_id,
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
      const roomNumber = (room as { room_number?: string } | null)?.room_number
      const message = `${guestName} booked ${roomNumber ? `Room ${roomNumber}` : 'a room'} for ${nights} night${nights === 1 ? '' : 's'} (${check_in} → ${check_out}).`

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
