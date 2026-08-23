import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { canGuestEdit } from '@/lib/booking'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isStaff = !!profile && ['super_admin', 'hotel_admin', 'staff'].includes(profile.role)

  // Read with the service-role client so a guest can load their own booking —
  // ownership is verified below either way.
  const adminRead = await createAdminClient()
  const { data: booking } = await adminRead
    .from('bookings')
    .select('id, hotel_id, room_id, room_ids, user_id, status, created_at, check_in, check_out')
    .eq('id', id)
    .single()
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (isStaff) {
    if (profile!.role !== 'super_admin' && booking.hotel_id !== profile!.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    // A guest may only touch their own booking, and only inside the one-day
    // window that closes after the hotel has planned around it.
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!canGuestEdit(booking)) {
      return NextResponse.json(
        {
          error: booking.status !== 'pending'
            ? 'This booking can no longer be changed here. Please contact the hotel.'
            : 'The 24-hour window to change this booking has closed. Please contact the hotel.',
        },
        { status: 403 },
      )
    }
  }

  const body = await request.json()
  const { check_in, check_out, room_ids, adults, children, special_requests, source, guest_name, guest_phone } = body

  const updates: Record<string, unknown> = {}

  // Every room on the booking, not just the primary one
  const effectiveRoomIds: string[] = booking.room_ids?.length ? booking.room_ids : [booking.room_id]

  // Rooms can be dropped, added or swapped. Whatever the final set is, it has
  // to belong to this hotel and be free for the stay — both checked below.
  let nextRoomIds = effectiveRoomIds
  if (Array.isArray(room_ids)) {
    const requested = Array.from(new Set(
      room_ids.filter((r: unknown): r is string => typeof r === 'string' && r.length > 0),
    ))
    if (!requested.length) {
      return NextResponse.json(
        { error: 'A booking must keep at least one room. Cancel the booking instead.' },
        { status: 400 },
      )
    }
    nextRoomIds = requested
  }
  const addedRoomIds = nextRoomIds.filter(r => !effectiveRoomIds.includes(r))
  // Compared as sets — a swap keeps the count identical but changes everything.
  const roomsChanged =
    nextRoomIds.length !== effectiveRoomIds.length ||
    nextRoomIds.some(r => !effectiveRoomIds.includes(r))

  // Availability and pricing are read with the service-role client: a guest's
  // RLS view only contains their own bookings, so a user-scoped conflict check
  // would happily let them move onto a room somebody else holds.
  const { data: bookedRooms } = await adminRead
    .from('rooms')
    .select('id, hotel_id, status, price_per_night, capacity, max_adults, max_children')
    .in('id', nextRoomIds)

  if (!bookedRooms || bookedRooms.length !== nextRoomIds.length) {
    return NextResponse.json({ error: 'One or more rooms not found' }, { status: 404 })
  }
  if (bookedRooms.some(r => r.hotel_id !== booking.hotel_id)) {
    return NextResponse.json({ error: 'Rooms must belong to the same hotel' }, { status: 400 })
  }
  // A guest can only pick up rooms the hotel is actually offering. Staff may put
  // someone in a room that's mid-clean or flagged, which is their call to make.
  if (!isStaff && addedRoomIds.length) {
    const unavailable = bookedRooms.filter(r => addedRoomIds.includes(r.id) && r.status !== 'available')
    if (unavailable.length) {
      return NextResponse.json({ error: 'That room is not available to book' }, { status: 409 })
    }
  }

  if (check_in && check_out && new Date(check_out) <= new Date(check_in)) {
    return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
  }

  // Re-check availability whenever the dates OR the rooms move — a room added
  // to an unchanged stay still has to be free for it.
  if ((check_in && check_out) || roomsChanged) {
    const from = check_in  ?? booking.check_in
    const to   = check_out ?? booking.check_out

    const { data: conflict } = await adminRead
      .from('bookings').select('id')
      .overlaps('room_ids', nextRoomIds)
      .neq('id', id)
      .in('status', ['confirmed', 'checked_in', 'pending'])
      .lt('check_in', to)
      .gt('check_out', from)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json({ error: 'One or more rooms are already booked for those dates.' }, { status: 409 })
    }
  }

  if (check_in && check_out) {
    updates.check_in  = check_in
    updates.check_out = check_out
  }

  if (roomsChanged) {
    updates.room_ids = nextRoomIds
    // The primary room must move too — `sync_booking_room_ids` would otherwise
    // put a dropped room straight back onto the booking.
    updates.room_id = nextRoomIds[0]
  }

  // Price follows whichever of the two actually moved.
  if ((check_in && check_out) || roomsChanged) {
    const from = (updates.check_in as string) ?? booking.check_in
    const to   = (updates.check_out as string) ?? booking.check_out
    const nights = Math.max(1, Math.ceil(
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
    ))
    updates.total_amount = nights * bookedRooms.reduce(
      (sum: number, r: { price_per_night: number }) => sum + (r.price_per_night ?? 0), 0
    )
  }

  if (adults           !== undefined) updates.adults           = adults
  if (children         !== undefined) updates.children         = children
  if (special_requests !== undefined) updates.special_requests = special_requests

  // Booking source and the walk-in guest's details belong to the hotel's own
  // records — a guest editing their reservation can't touch them.
  if (isStaff) {
    if (source      !== undefined) updates.source      = source
    if (guest_name  !== undefined) updates.guest_name  = guest_name
    if (guest_phone !== undefined) updates.guest_phone = guest_phone
  }

  if (adults !== undefined || children !== undefined) {
    const adultCount = Math.max(1, Number(adults ?? 1))
    const childCount = Math.max(0, Number(children ?? 0))
    const capacity = (bookedRooms ?? []).reduce(
      (sum, r) => sum + (r.capacity ?? ((r.max_adults ?? 0) + (r.max_children ?? 0))), 0,
    )
    if (capacity > 0 && adultCount + childCount > capacity) {
      return NextResponse.json(
        { error: `${nextRoomIds.length > 1 ? 'The remaining rooms accommodate' : 'This room accommodates'} up to ${capacity} guest(s).` },
        { status: 400 },
      )
    }
    updates.adults   = adultCount
    updates.children = childCount
    updates.guests   = adultCount + childCount
  }

  const admin = await createAdminClient()
  const { error } = await admin.from('bookings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // A changed stay changes what's owed — keep the unpaid payment row in step.
  if (updates.total_amount !== undefined) {
    await admin
      .from('payments')
      .update({ amount: updates.total_amount })
      .eq('booking_id', id)
      .eq('status', 'pending')
  }

  return NextResponse.json({
    success: true,
    total_amount: updates.total_amount,
    room_ids: nextRoomIds,
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
