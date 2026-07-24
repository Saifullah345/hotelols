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

  const [{ data: rooms }, { data: roomTypes }, { data: hotelInfo }] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(id, name), images')
      .eq('hotel_id', tenantId)
      .order('room_number'),
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
  ])

  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  return (
    <RoomsClient
      rooms={rooms ?? []}
      roomTypes={roomTypes ?? []}
      currency={currency}
    />
  )
}
