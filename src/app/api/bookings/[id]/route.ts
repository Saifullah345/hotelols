import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings').select('id, hotel_id, room_id').eq('id', id).single()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && booking.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { check_in, check_out, adults, children, special_requests, source, guest_name, guest_phone } = body

  const updates: Record<string, unknown> = {}

  const effectiveRoomId = booking.room_id

  if (check_in && check_out) {
    const { data: conflict } = await supabase
      .from('bookings').select('id')
      .eq('room_id', effectiveRoomId)
      .neq('id', id)
      .in('status', ['confirmed', 'checked_in', 'pending'])
      .lt('check_in', check_out)
      .gt('check_out', check_in)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json({ error: 'Room is already booked for those dates.' }, { status: 409 })
    }

    const { data: room } = await supabase
      .from('rooms').select('price_per_night').eq('id', effectiveRoomId).single()

    if (room) {
      const nights = Math.max(1, Math.ceil(
        (new Date(check_out).getTime() - new Date(check_in).getTime()) / 86_400_000
      ))
      updates.total_amount = nights * room.price_per_night
    }

    updates.check_in  = check_in
    updates.check_out = check_out
  }

  if (adults           !== undefined) updates.adults           = adults
  if (children         !== undefined) updates.children         = children
  if (special_requests !== undefined) updates.special_requests = special_requests
  if (source           !== undefined) updates.source           = source
  if (guest_name       !== undefined) updates.guest_name       = guest_name
  if (guest_phone      !== undefined) updates.guest_phone      = guest_phone

  const admin = await createAdminClient()
  const { error } = await admin.from('bookings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, total_amount: updates.total_amount })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings').select('id, hotel_id').eq('id', id).single()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && booking.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = await createAdminClient()
  const { error } = await admin.from('bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
