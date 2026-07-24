import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingsClient, { type RoomOption } from './BookingsClient'

export const metadata = { title: 'Bookings' }

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const [{ data: bookings }, { data: hotelInfo }, { data: rooms }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, user:profiles(full_name, email), room:rooms(id, room_number, name, price_per_night, capacity, room_type:room_types(name))')
      .eq('hotel_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase.from('hotels').select('currency').eq('id', tenantId).single(),
    supabase
      .from('rooms')
      .select('id, room_number, name, price_per_night, max_adults, max_children, capacity, room_type:room_types(name)')
      .eq('hotel_id', tenantId)
      .order('room_number'),
  ])

  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  return <BookingsClient bookings={bookings ?? []} currency={currency} rooms={(rooms ?? []) as RoomOption[]} />
}
