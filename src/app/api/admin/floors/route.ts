import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sb = await createClient()
  const { data: user } = await sb.auth.getUser()
  if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await sb.from('profiles').select('tenant_id').eq('id', user.user.id).single()
  if (!prof?.tenant_id) return NextResponse.json({ error: 'No hotel' }, { status: 403 })

  const { data, error } = await sb
    .from('hotel_floors')
    .select('id, floor_number, name')
    .eq('hotel_id', prof.tenant_id)
    .order('floor_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: user } = await sb.auth.getUser()
  if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await sb.from('profiles').select('tenant_id').eq('id', user.user.id).single()
  if (!prof?.tenant_id) return NextResponse.json({ error: 'No hotel' }, { status: 403 })

  const body = await req.json()
  const { floor_number, name } = body

  if (typeof floor_number !== 'number' || floor_number < 0) {
    return NextResponse.json({ error: 'floor_number must be a non-negative integer' }, { status: 400 })
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Floor name is required' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('hotel_floors')
    .insert({ hotel_id: prof.tenant_id, floor_number, name: name.trim() })
    .select('id, floor_number, name')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Floor ${floor_number} already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
