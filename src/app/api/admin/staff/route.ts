import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripHtml } from '@/lib/sanitize'
import { isValidEmail } from '@/lib/validation'
import { blockIfExpired } from '@/lib/subscription-guard'

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

  // The dashboard already hides itself behind the plan gate; this is what
  // actually stops a stale tab or a direct request from operating a hotel
  // with no running subscription.
  const blocked = await blockIfExpired(hotelId)
  if (blocked) return blocked

  const body = await request.json().catch(() => ({}))
  const { name, email, phone, department, position, shift, salary } = body

  const cleanName     = stripHtml(typeof name === 'string' ? name : '').trim()
  const cleanEmail    = stripHtml(typeof email === 'string' ? email : '').trim()
  const cleanPosition = stripHtml(typeof position === 'string' ? position : '').trim()
  const cleanDept     = stripHtml(typeof department === 'string' ? department : '').trim()

  if (!cleanName)              return NextResponse.json({ error: 'Name is required' },                     { status: 400 })
  if (cleanName.length < 2)    return NextResponse.json({ error: 'Name must be at least 2 characters' },  { status: 400 })
  if (cleanName.length > 50)   return NextResponse.json({ error: 'Name cannot exceed 50 characters' },    { status: 400 })
  if (!cleanDept)              return NextResponse.json({ error: 'Department is required' },               { status: 400 })
  if (!cleanPosition)                    return NextResponse.json({ error: 'Position is required' },                                { status: 400 })
  if (cleanPosition.length < 2)          return NextResponse.json({ error: 'Position must be at least 2 characters' },             { status: 400 })
  if (cleanPosition.length > 60)         return NextResponse.json({ error: 'Position cannot exceed 60 characters' },               { status: 400 })
  if (!/[a-zA-Z]/.test(cleanPosition))   return NextResponse.json({ error: 'Position must contain at least one letter' },          { status: 400 })
  if (/[.\-/'"\\]/.test(cleanPosition))  return NextResponse.json({ error: 'Position cannot contain dots, dashes, or slashes' },   { status: 400 })
  if (!cleanEmail)             return NextResponse.json({ error: 'Email is required' },                    { status: 400 })
  if (!isValidEmail(cleanEmail))
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
