import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!profile || !['hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const reviewId = typeof body?.reviewId === 'string' ? body.reviewId : ''
  const isPublished = typeof body?.isPublished === 'boolean' ? body.isPublished : false

  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id, hotel_id')
    .eq('id', reviewId)
    .single()

  if (!existing || existing.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({ is_published: isPublished })
    .eq('id', reviewId)
    .select('*, user:profiles(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
