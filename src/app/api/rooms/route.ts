import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  const { searchParams } = new URL(request.url)
  const hotelId = searchParams.get('hotel_id') ?? profile?.tenant_id

  if (!hotelId) return NextResponse.json({ error: 'hotel_id required' }, { status: 400 })

  if (profile?.role !== 'super_admin' && profile?.tenant_id !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_type:room_types(name)')
    .eq('hotel_id', hotelId)
    .order('room_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!['super_admin', 'hotel_admin'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const hotelId = profile.role === 'hotel_admin' ? profile.tenant_id : body.hotel_id

  const { data: hotel } = await supabase.from('hotels').select('plan:plans(max_rooms)').eq('id', hotelId).single()
  const { count: roomCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId)
  const maxRooms = (hotel?.plan as { max_rooms?: number })?.max_rooms ?? 0

  if (maxRooms !== -1 && (roomCount ?? 0) >= maxRooms) {
    return NextResponse.json({ error: `Room limit reached. Upgrade your plan to add more rooms.` }, { status: 403 })
  }

  const { data, error } = await supabase.from('rooms').insert({ ...body, hotel_id: hotelId }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
