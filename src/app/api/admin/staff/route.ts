import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!caller || !['super_admin', 'hotel_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hotelId = caller.tenant_id
  if (!hotelId) return NextResponse.json({ error: 'No hotel associated with this account' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const { name, email, phone, department, position, shift, salary } = body

  if (!name?.trim())     return NextResponse.json({ error: 'Name is required' },       { status: 400 })
  if (!department?.trim()) return NextResponse.json({ error: 'Department is required' }, { status: 400 })
  if (!position?.trim()) return NextResponse.json({ error: 'Position is required' },   { status: 400 })

  const admin = await createAdminClient()
  const { data, error } = await admin.from('staff').insert({
    hotel_id:   hotelId,
    name:       name.trim(),
    email:      email?.trim() || null,
    phone:      phone?.trim() || null,
    department: department.trim(),
    position:   position.trim(),
    shift:      shift || null,
    salary:     parseFloat(salary) || 0,
    status:     'active',
    is_active:  true,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, id: data.id })
}
