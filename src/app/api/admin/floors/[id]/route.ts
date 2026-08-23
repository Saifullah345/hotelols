import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getHotelId(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data: user } = await sb.auth.getUser()
  if (!user.user) return null
  const { data: prof } = await sb.from('profiles').select('tenant_id').eq('id', user.user.id).single()
  return prof?.tenant_id ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const hotelId = await getHotelId(sb)
  if (!hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { floor_number, name } = body

  const update: Record<string, unknown> = {}
  if (typeof floor_number === 'number') update.floor_number = floor_number
  if (name?.trim()) update.name = name.trim()

  const { data, error } = await sb
    .from('hotel_floors')
    .update(update)
    .eq('id', id)
    .eq('hotel_id', hotelId)
    .select('id, floor_number, name')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'That floor number already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const hotelId = await getHotelId(sb)
  if (!hotelId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sb
    .from('hotel_floors')
    .delete()
    .eq('id', id)
    .eq('hotel_id', hotelId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
