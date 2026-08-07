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

  const strip = (v: unknown) => typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/[<>]/g, '') : ''

  const cleanName     = strip(name).trim()
  const cleanEmail    = strip(email).trim()
  const cleanPosition = strip(position).trim()
  const cleanDept     = strip(department).trim()

  if (!cleanName)              return NextResponse.json({ error: 'Name is required' },                     { status: 400 })
  if (cleanName.length < 2)    return NextResponse.json({ error: 'Name must be at least 2 characters' },  { status: 400 })
  if (cleanName.length > 80)   return NextResponse.json({ error: 'Name cannot exceed 80 characters' },    { status: 400 })
  if (!cleanDept)              return NextResponse.json({ error: 'Department is required' },               { status: 400 })
  if (!cleanPosition)          return NextResponse.json({ error: 'Position is required' },                 { status: 400 })
  if (cleanPosition.length > 60) return NextResponse.json({ error: 'Position cannot exceed 60 characters' }, { status: 400 })
  if (!cleanEmail)             return NextResponse.json({ error: 'Email is required' },                    { status: 400 })
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(cleanEmail))
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

  const admin = await createAdminClient()
  const { data, error } = await admin.from('staff').insert({
    hotel_id:   hotelId,
    name:       cleanName,
    email:      cleanEmail,
    phone:      typeof phone === 'string' ? phone.trim() || null : null,
    department: cleanDept,
    position:   cleanPosition,
    shift:      shift || null,
    salary:     parseFloat(salary) || 0,
    status:     'active',
    is_active:  true,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, id: data.id })
}
