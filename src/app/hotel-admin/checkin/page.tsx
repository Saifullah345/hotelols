import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckInClient from './CheckInClient'

export const metadata = { title: 'Check-In / Out' }
export const dynamic = 'force-dynamic'

export type BookingEntry = {
  id: string
  check_in: string
  check_out: string
  total_amount: number | null
  guests: number | null
  status: string
  room_id: string | null
  room_ids: string[] | null
  userName: string
  userEmail: string
  userAvatar: string | null
  roomNumber: string
  roomTypeName: string
}

const SELECT =
  'id, check_in, check_out, total_amount, guests, status, room_id, room_ids,' +
  ' user:profiles(full_name, email, avatar_url),' +
  ' room:rooms(room_number, floor, room_type:room_types(name))'

function normalize(raw: Record<string, unknown>[]): BookingEntry[] {
  return raw.map(b => {
    const u = b.user as { full_name?: string; email?: string; avatar_url?: string } | null
    const r = b.room as { room_number?: string; room_type?: { name?: string } } | null
    return {
      id: b.id as string,
      check_in: b.check_in as string,
      check_out: b.check_out as string,
      total_amount: b.total_amount as number | null,
      guests: b.guests as number | null,
      status: b.status as string,
      room_id: b.room_id as string | null,
      room_ids: b.room_ids as string[] | null,
      userName: u?.full_name?.trim() || u?.email || 'Guest',
      userEmail: u?.email || '',
      userAvatar: u?.avatar_url || null,
      roomNumber: r?.room_number || '—',
      roomTypeName: r?.room_type?.name || '',
    }
  })
}

export default async function CheckInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: rawArrivals },
    { data: rawInHouse },
    { data: rawUpcoming },
  ] = await Promise.all([
    supabase.from('bookings')
      .select(SELECT)
      .eq('hotel_id', tenantId)
      .eq('check_in', today)
      .eq('status', 'confirmed')
      .order('created_at'),
    supabase.from('bookings')
      .select(SELECT)
      .eq('hotel_id', tenantId)
      .eq('status', 'checked_in')
      .order('check_out'),
    supabase.from('bookings')
      .select(SELECT)
      .eq('hotel_id', tenantId)
      .eq('status', 'confirmed')
      .gt('check_in', today)
      .order('check_in')
      .limit(15),
  ])

  const arrivals = normalize((rawArrivals ?? []) as unknown as Record<string, unknown>[])
  const inHouse  = normalize((rawInHouse  ?? []) as unknown as Record<string, unknown>[])
  const upcoming = normalize((rawUpcoming ?? []) as unknown as Record<string, unknown>[])
  const departuresToday = inHouse.filter(b => b.check_out === today).length

  return (
    <CheckInClient
      arrivals={arrivals}
      inHouse={inHouse}
      upcoming={upcoming}
      departuresToday={departuresToday}
    />
  )
}
