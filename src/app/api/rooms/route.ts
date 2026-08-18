import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { roomNameSchema, roomNumberSchema } from '@/lib/validation'
import { limitReached } from '@/lib/plan-features'
import { blockIfExpired } from '@/lib/subscription-guard'

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
    // Matches the drag order set on the Rooms page.
    .order('sort_order', { ascending: true })
    .order('room_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  })
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

  // The dashboard already hides itself behind the plan gate; this is what
  // actually stops a stale tab or a direct request from operating a hotel
  // with no running subscription.
  const blocked = await blockIfExpired(hotelId)
  if (blocked) return blocked

  // Validate identity fields (reject markup / symbol-only input)
  if (body.room_number !== undefined) {
    const rn = roomNumberSchema.safeParse(body.room_number)
    if (!rn.success) return NextResponse.json({ error: rn.error.issues[0].message }, { status: 400 })
  }
  if (body.name !== undefined && body.name !== null) {
    const nm = roomNameSchema.safeParse(body.name)
    if (!nm.success) return NextResponse.json({ error: nm.error.issues[0].message }, { status: 400 })
  }

  // Enforce plan room limit (-1, or any negative from bad data = unlimited)
  const { data: hotelPlan } = await supabase
    .from('hotels').select('plan:plans(max_rooms, name)').eq('id', hotelId).single()
  const { count: roomCount } = await supabase
    .from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelId)
  const maxRooms  = (hotelPlan?.plan as { max_rooms?: number } | null)?.max_rooms ?? 0
  const planName  = (hotelPlan?.plan as { name?: string }     | null)?.name ?? 'current'

  if (limitReached(maxRooms, roomCount ?? 0)) {
    return NextResponse.json({
      error: `Room limit reached. Your ${planName} plan allows up to ${maxRooms} rooms. Upgrade your plan to add more.`,
    }, { status: 403 })
  }

  const { data, error } = await supabase.from('rooms').insert({ ...body, hotel_id: hotelId }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
