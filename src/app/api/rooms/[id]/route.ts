import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify room belongs to this admin's hotel
  const { data: room } = await supabase
    .from('rooms').select('id, hotel_id, room_number').eq('id', id).single()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && room.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { room_number, name, floor, price_per_night, room_type_id,
          max_adults, max_children, amenities, notes, status } = body

  // Duplicate room-number guard
  if (room_number && room_number !== room.room_number) {
    const { data: dup } = await supabase
      .from('rooms').select('id')
      .eq('hotel_id', room.hotel_id)
      .eq('room_number', room_number)
      .neq('id', id)
      .maybeSingle()
    if (dup) {
      return NextResponse.json(
        { error: `Room number "${room_number}" already exists in this hotel.` },
        { status: 409 },
      )
    }
  }

  const updates: Record<string, unknown> = {}
  if (room_number     !== undefined) updates.room_number     = room_number
  if (name            !== undefined) updates.name            = name       // null clears it
  if (floor           !== undefined) updates.floor           = floor
  if (price_per_night !== undefined) updates.price_per_night = price_per_night
  if (room_type_id    !== undefined) updates.room_type_id    = room_type_id
  if (max_adults      !== undefined) updates.max_adults      = max_adults
  if (max_children    !== undefined) updates.max_children    = max_children
  if (amenities       !== undefined) updates.amenities       = amenities   // capacity is generated — never set it
  if (notes           !== undefined) updates.notes           = notes
  if (status          !== undefined) updates.status          = status

  const { data: updated, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select('*, room_type:room_types(name, capacity)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: room } = await supabase.from('rooms').select('id, hotel_id').eq('id', id).single()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && room.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Block deletion if active bookings exist
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)
    .in('status', ['pending', 'confirmed', 'checked_in'])

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: room has ${count} active booking(s). Cancel or reassign them first.` },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
