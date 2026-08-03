import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingsClient, { type RoomOption } from './BookingsClient'
import { markExpiredBookings } from '@/lib/bookings'

export const metadata = { title: 'Bookings' }

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const todayISO = new Date().toISOString().slice(0, 10)
  await markExpiredBookings(supabase, tenantId, todayISO)

  const [{ data: bookings }, { data: hotelInfo }, { data: rooms }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, user:profiles(full_name, email, avatar_url), room:rooms(id, room_number, name, price_per_night, capacity, room_type:room_types(name))')
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
      bookings={bookings ?? []}
      currency={currency}
      rooms={(rooms ?? []) as RoomOption[]}
      today={today}
    />
  )
}
