import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoomTypesClient from './RoomTypesClient'

export const metadata = { title: 'Room Types' }

export default async function RoomTypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: types } = await supabase
    .from('room_types')
    .select('id, name, description, max_adults, max_children, amenities')
    .eq('hotel_id', tenantId)
    .order('name')

  return <RoomTypesClient initial={types ?? []} />
}
