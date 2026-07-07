import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!caller || !['super_admin', 'hotel_admin'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const action = body?.action === 'unsuspend' ? 'unsuspend' : 'suspend'

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: getUserData, error: targetError } = await admin.auth.admin.getUserById(userId)
  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 400 })
  }

  if (!getUserData?.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const banDuration = action === 'suspend' ? '100y' : 'none'
  const { data: updateData, error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: updateData?.user })
}
