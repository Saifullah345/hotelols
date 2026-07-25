import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('room_types').select('hotel_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && existing.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, max_adults, max_children, amenities } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('room_types')
    .update({
      name:         name.trim(),
      description:  description?.trim() || null,
      max_adults:   max_adults  ?? 2,
      max_children: max_children ?? 1,
      amenities:    amenities ?? [],
    })
    .eq('id', id)
    .select('id, name, description, max_adults, max_children, amenities')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('room_types').select('hotel_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
  if (profile.role !== 'super_admin' && existing.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Block deletion if rooms are using this type
  const { count } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('room_type_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} room${count !== 1 ? 's' : ''} still use this type. Reassign them first.` },
      { status: 409 },
    )
  }

  const admin = await createAdminClient()
  const { error } = await admin.from('room_types').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
