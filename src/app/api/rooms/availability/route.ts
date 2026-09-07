import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasValidRange } from '@/lib/search'
import { hourlyProblem, staysOverlap, type StayInterval } from '@/lib/hourly'

/**
 * Rooms a hotel can still let for a given stay.
 *
 * A guest's RLS view of `bookings` only contains their own, so they can't work
 * out what's taken from the browser. This answers that with the service-role
 * client — the same availability the public hotel page already shows, narrowed
 * to a date range and optionally ignoring the booking being edited.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const hotelId  = searchParams.get('hotel_id')
  const checkIn  = searchParams.get('check_in')  ?? undefined
  const checkOut = searchParams.get('check_out') ?? undefined
  // A short stay occupies hours inside a day, so it is matched on the same
  // boundaries POST /api/bookings uses — a date window can't express it.
  const isHourly     = searchParams.get('booking_type') === 'hourly'
  const checkInTime  = searchParams.get('check_in_time')  ?? undefined
  const checkOutTime = searchParams.get('check_out_time') ?? undefined
  // Rooms on the booking being edited aren't "taken" from its own point of view.
  const exclude = new Set(
    (searchParams.get('exclude') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  )

  if (!hotelId) return NextResponse.json({ error: 'hotel_id required' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: rooms, error } = await admin
    .from('rooms')
    .select('id, room_number, name, price_per_night, rate_per_hour, max_adults, max_children, capacity, status, room_type:room_types(name)')
    .eq('hotel_id', hotelId)
    .eq('status', 'available')
    .order('sort_order', { ascending: true })
    .order('room_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stay: StayInterval | null = isHourly && checkIn
    ? {
        // Same-day by definition: the times are the whole window.
        check_in: checkIn, check_out: checkIn, booking_type: 'hourly',
        check_in_time: checkInTime, check_out_time: checkOutTime,
      }
    : null

  const usable = stay ? hourlyProblem(stay) === null : hasValidRange(checkIn, checkOut)
  if (!usable) {
    // Without a usable window there's nothing to test availability against.
    return NextResponse.json(rooms ?? [])
  }

  // Inclusive on both ends: a same-day hourly stay has check_in === check_out,
  // which a strict lt/gt window would exclude entirely. It over-selects by a day
  // at each end and `staysOverlap` decides on the real boundaries — the same
  // shape POST /api/bookings uses, so the two can't disagree about a clash.
  const windowStart = checkIn!
  const windowEnd   = stay ? checkIn! : checkOut!

  const { data: overlapping } = await admin
    .from('bookings')
    .select('id, room_id, room_ids, check_in, check_out, booking_type, check_in_time, check_out_time')
    .eq('hotel_id', hotelId)
    .in('status', ['confirmed', 'checked_in', 'pending'])
    .lte('check_in', windowEnd)
    .gte('check_out', windowStart)

  const wanted: StayInterval = stay ?? { check_in: checkIn!, check_out: checkOut! }

  const taken = new Set<string>()
  for (const b of (overlapping ?? []) as (StayInterval & { id: string; room_id: string; room_ids: string[] | null })[]) {
    if (exclude.has(b.id)) continue
    if (!staysOverlap(wanted, b)) continue
    for (const rid of (b.room_ids?.length ? b.room_ids : [b.room_id])) if (rid) taken.add(rid)
  }

  // Note: a pending hold counts as taken here, which is stricter than the
  // public listing — a guest shouldn't be offered a room someone is mid-booking.
  // A room with no hourly rate isn't let by the hour at all, so it is dropped
  // from a short-stay search the same way a booked one is.
  return NextResponse.json(
    (rooms ?? []).filter(r => !taken.has(r.id) && (!isHourly || r.rate_per_hour != null)),
  )
}
