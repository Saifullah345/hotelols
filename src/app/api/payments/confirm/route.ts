import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData()
  const paymentId = typeof form.get('paymentId') === 'string' ? form.get('paymentId') : ''
  const action = typeof form.get('action') === 'string' ? form.get('action') : ''

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
  }

  const allowed = ['complete', 'fail', 'refund']
  const resolvedAction = allowed.includes(action as string ) ? action : 'complete'

  const { data: existing } = await supabase
    .from('payments')
    .select('id, hotel_id, status, amount')
    .eq('id', paymentId)
    .single()

  if (!existing || existing.hotel_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  const paidAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: resolvedAction,
      paid_at: paidAt,
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (resolvedAction === 'complete') {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', data.booking_id)
  }

  return NextResponse.json(data)
}
