import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import RoomTypesClient from './RoomTypesClient'

export const metadata = { title: 'Room Types' }

export default async function RoomTypesPage() {
  const supabase = await createClient()
  const { tenantId } = await requireTenant()

  const { data: types } = await supabase
    .from('room_types')
    .select('id, name, description, max_adults, max_children, amenities')
    .eq('hotel_id', tenantId)
    .order('name')

  return <RoomTypesClient initial={types ?? []} />
}
