import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hotel_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10)
  const q = req.nextUrl.searchParams.get('q') ?? ''

  let query = supabase
    .from('staff')
    .select('id, user_id, name, email, phone, department, position, is_active, status, shift, salary, user:profiles(full_name, email, phone)')
    .eq('hotel_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,position.ilike.%${q}%,department.ilike.%${q}%`)
  }

  const { data: items, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    items: items ?? [],
    hasMore: (items ?? []).length === PAGE_SIZE,
  })
}
