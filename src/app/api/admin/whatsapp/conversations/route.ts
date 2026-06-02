import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select(`
      *,
      messages:whatsapp_messages(id, direction, content, created_at, status)
    `)
    .eq('hotel_id', profile.tenant_id!)
    .order('last_message_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status, guest_name } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (status)     update.status     = status
  if (guest_name) update.guest_name = guest_name

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update(update)
    .eq('id', id)
    .eq('hotel_id', profile.tenant_id!)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
