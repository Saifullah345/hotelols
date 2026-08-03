import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoomsClient from './RoomsClient'

export const metadata = { title: 'Rooms' }

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const PAGE_SIZE = 4

  const [{ data: rooms }, { data: roomTypes }, { data: hotelInfo }, { data: allStatuses }] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(id, name, capacity), images')
      .eq('hotel_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('room_number')
      .range(0, PAGE_SIZE - 1),
    supabase
      .from('room_types')
      .select('id, name')
      .eq('hotel_id', tenantId)
      .order('name'),
    supabase
      .from('hotels')
      .select('currency')
      .eq('id', tenantId)
      .single(),
    // Lightweight: just status field for header count chips
    supabase
      .from('rooms')
      .select('status')
      .eq('hotel_id', tenantId),
  ])

  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'
  const statuses = (allStatuses ?? []) as { status: string }[]

  return (
    <RoomsClient
      rooms={rooms ?? []}
      roomTypes={roomTypes ?? []}
      currency={currency}
      hotelId={tenantId}
      pageSize={PAGE_SIZE}
      totalAvailable={statuses.filter(r => r.status === 'available').length}
      totalBooked={statuses.filter(r => r.status === 'booked').length}
      totalMaintenance={statuses.filter(r => r.status === 'maintenance').length}
      totalRooms={statuses.length}
    />
  )
}
