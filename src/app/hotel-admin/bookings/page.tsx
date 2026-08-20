import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import BookingsClient, { type Booking, type RoomOption } from './BookingsClient'
import { markExpiredBookings } from '@/lib/bookings'

export const metadata = { title: 'Bookings' }

export default async function BookingsPage() {
  const supabase = await createClient()
  const { tenantId } = await requireTenant()

  const todayISO = new Date().toISOString().slice(0, 10)

  // Run expiry update concurrently with data reads.  Booking statuses are
  // eventually consistent — at worst one page load shows a stale "confirmed"
  // for a booking that expired today; the next load corrects it.
  markExpiredBookings(supabase, tenantId, todayISO).catch(() => {})

  const [{ data: bookings }, { data: hotelInfo }, { data: rooms }] = await Promise.all([
    supabase
      .from('bookings')
      // Named columns instead of `*`: the list only renders these, and the
      // dropped ones (hotel_id, updated_at, cancellation_reason) were being
      // serialised for every booking the hotel has ever taken.
      .select(`
        id, created_at, check_in, check_out, status, total_amount, source,
        adults, children, special_requests, guest_name, guest_phone,
        user_id, room_id, room_ids,
        user:profiles(full_name, email, avatar_url),
        room:rooms(id, room_number, name, price_per_night, capacity, room_type:room_types(name))
      `)
      .eq('hotel_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase.from('hotels').select('currency').eq('id', tenantId).single(),
    supabase
      .from('rooms')
      .select('id, room_number, name, price_per_night, max_adults, max_children, capacity, room_type:room_types(name)')
      .eq('hotel_id', tenantId)
      // Same order as the Rooms page drag-and-drop, so staff see one consistent
      // room layout everywhere. room_number only breaks ties.
      .order('sort_order', { ascending: true })
      .order('room_number'),
  ])

  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'
  // Anchor "today" server-side so the date filters can't disagree between the
  // server render and the client hydration when the two are in different zones.
  const today = new Date().toISOString().split('T')[0]

  return (
    <BookingsClient
      bookings={(bookings ?? []) as unknown as Booking[]}
      currency={currency}
      rooms={(rooms ?? []) as RoomOption[]}
      today={today}
    />
  )
}
