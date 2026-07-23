import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const hotelId = body?.hotelId === null || typeof body?.hotelId === 'string' ? body.hotelId : undefined

  if (!userId || hotelId === undefined) {
    return NextResponse.json({ error: 'userId and hotelId are required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const [{ data: target, error: targetError }, hotelResult] = await Promise.all([
    admin.from('profiles').select('role').eq('id', userId).single(),
    hotelId ? admin.from('hotels').select('id').eq('id', hotelId).single() : Promise.resolve({ data: null, error: null }),
  ])

  if (targetError || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Super admin cannot be linked to a hotel' }, { status: 400 })
  }
  if (hotelId && (hotelResult.error || !hotelResult.data)) {
    return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ tenant_id: hotelId })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, hotelId })
}