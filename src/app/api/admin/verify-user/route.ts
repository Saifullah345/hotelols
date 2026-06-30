import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

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
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { data: getUserData, error: targetError } = await admin.auth.admin.getUserById(userId)
  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 400 })
  }

  const targetUser = getUserData?.user
  if (targetUser?.email_confirmed_at) {
    return NextResponse.json({ success: true, alreadyVerified: true, user: targetUser })
  }

  const { data: updateData, error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: updateData?.user })
}
