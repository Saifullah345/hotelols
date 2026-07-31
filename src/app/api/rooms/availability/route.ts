import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasValidRange } from '@/lib/search'

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
  // Rooms on the booking being edited aren't "taken" from its own point of view.
  const exclude = new Set(
    (searchParams.get('exclude') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  )

  if (!hotelId) return NextResponse.json({ error: 'hotel_id required' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: rooms, error } = await admin
    .from('rooms')
    .select('id, room_number, name, price_per_night, max_adults, max_children, capacity, status, room_type:room_types(name)')
    .eq('hotel_id', hotelId)
    .eq('status', 'available')
    .order('sort_order', { ascending: true })
    .order('room_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!hasValidRange(checkIn, checkOut)) {
    // Without a usable range there's nothing to test availability against.
    return NextResponse.json(rooms ?? [])
  }

  const { data: overlapping } = await admin
    .from('bookings')
    .select('id, room_id, room_ids')
    .eq('hotel_id', hotelId)
    .in('status', ['confirmed', 'checked_in', 'pending'])
    .lt('check_in', checkOut!)
    .gt('check_out', checkIn!)

  const taken = new Set<string>()
  for (const b of (overlapping ?? []) as { id: string; room_id: string; room_ids: string[] | null }[]) {
    if (exclude.has(b.id)) continue
    for (const rid of (b.room_ids?.length ? b.room_ids : [b.room_id])) if (rid) taken.add(rid)
  }

  // Note: a pending hold counts as taken here, which is stricter than the
  // public listing — a guest shouldn't be offered a room someone is mid-booking.
  return NextResponse.json((rooms ?? []).filter(r => !taken.has(r.id)))
}
