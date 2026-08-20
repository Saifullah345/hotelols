import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import { getCachedHotel, getCachedRoomTypes } from '@/lib/cache'
import RoomsClient from './RoomsClient'

export const metadata = { title: 'Rooms' }

export default async function RoomsPage() {
  const supabase = await createClient()
  const { tenantId } = await requireTenant()

  const PAGE_SIZE = 4

  const [{ data: rooms }, { data: allStatuses }, hotelData, roomTypes] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(id, name, capacity), images')
      .eq('hotel_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('room_number')
      .range(0, PAGE_SIZE - 1),
    // Lightweight: just status field for header count chips
    supabase
      .from('rooms')
      .select('status')
      .eq('hotel_id', tenantId),
    getCachedHotel(tenantId),
    getCachedRoomTypes(tenantId),
  ])

  const currency     = hotelData?.currency ?? 'USD'
  const planMaxRooms = (hotelData?.plan?.max_rooms ?? -1)
  const planName     = hotelData?.plan?.name ?? ''
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
      planMaxRooms={planMaxRooms}
      planName={planName}
    />
  )
}
