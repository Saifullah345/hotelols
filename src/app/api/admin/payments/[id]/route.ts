import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { blockIfExpired } from '@/lib/subscription-guard'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = await createAdminClient()

  // Verify the payment belongs to this hotel before deleting
  const { data: payment } = await admin
    .from('payments')
    .select('id, hotel_id')
    .eq('id', id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // The dashboard already hides itself behind the plan gate; this is what
  // actually stops a stale tab or a direct request from operating a hotel
  // with no running subscription.
  const blocked = await blockIfExpired(payment.hotel_id)
  if (blocked) return blocked

  const { error } = await admin.from('payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
