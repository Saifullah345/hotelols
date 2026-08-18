import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { roomTypeNameSchema, amenitySchema } from '@/lib/validation'
import { blockIfExpired } from '@/lib/subscription-guard'

function validatePayload(body: Record<string, unknown>): string | null {
  const name = roomTypeNameSchema.safeParse(body.name)
  if (!name.success) return name.error.errors[0].message

  if (body.description != null) {
    const desc = String(body.description).trim()
    if (desc.length > 200) return 'Description is too long (max 200 characters)'
    if (/<[^>]+>/.test(desc)) return 'Description cannot contain HTML'
  }

  const adults = Number(body.max_adults)
  if (!Number.isInteger(adults) || adults < 1 || adults > 20)
    return 'Max adults must be between 1 and 20'

  const children = Number(body.max_children)
  if (!Number.isInteger(children) || children < 0 || children > 20)
    return 'Max children must be between 0 and 20'

  if (body.amenities != null) {
    if (!Array.isArray(body.amenities)) return 'Amenities must be an array'
    if (body.amenities.length > 30) return 'Too many amenities (max 30)'
    for (const a of body.amenities) {
      const r = amenitySchema.safeParse(a)
      if (!r.success) return `Invalid amenity: ${r.error.errors[0].message}`
    }
  }

  return null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'No hotel assigned' }, { status: 400 })

  const { data, error } = await supabase
    .from('room_types')
    .select('id, name, description, max_adults, max_children, amenities')
    .eq('hotel_id', profile.tenant_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // The dashboard already hides itself behind the plan gate; this is what
  // actually stops a stale tab or a direct request from operating a hotel
  // with no running subscription.
  const blocked = await blockIfExpired(profile.tenant_id)
  if (blocked) return blocked

  const body = await request.json()
  const validationError = validatePayload(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { name, description, max_adults, max_children, amenities } = body
  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('room_types')
    .insert({
      hotel_id:     profile.tenant_id,
      name:         name.trim(),
      description:  description?.trim() || null,
      max_adults:   Number(max_adults),
      max_children: Number(max_children),
      amenities:    amenities ?? [],
    })
    .select('id, name, description, max_adults, max_children, amenities')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
