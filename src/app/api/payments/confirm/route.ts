import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The payments table constraint only allows these statuses. The form sends a
// short verb (complete/fail/refund); map it to the stored past-tense status.
const ACTION_TO_STATUS: Record<string, string> = {
  complete: 'completed',
  fail: 'failed',
  refund: 'refunded',
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  // This endpoint is submitted via a native HTML <form>, so respond with a
  // redirect back to the payments page (not JSON) — otherwise the browser would
  // render the raw JSON response.
  const back = (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return NextResponse.redirect(`${origin}/hotel-admin/payments${qs}`, { status: 303 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 })

  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['hotel_admin', 'staff'].includes(profile.role)) {
    return back({ error: 'You are not allowed to update payments.' })
  }

  const form = await request.formData()
  const paymentId = typeof form.get('paymentId') === 'string' ? (form.get('paymentId') as string) : ''
  const action = typeof form.get('action') === 'string' ? (form.get('action') as string) : ''

  if (!paymentId) return back({ error: 'Missing payment reference.' })

  const status = ACTION_TO_STATUS[action] ?? 'completed'

  const { data: existing } = await supabase
    .from('payments')
    .select('id, hotel_id, status')
    .eq('id', paymentId)
    .single()

  if (!existing || existing.hotel_id !== profile.tenant_id) {
    return back({ error: 'Payment not found.' })
  }

  const update: Record<string, unknown> = { status }
  // Only a completed payment has a real "paid at" time.
  if (status === 'completed') update.paid_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('payments')
    .update(update)
    .eq('id', paymentId)
    .select('booking_id')
    .single()

  if (error) return back({ error: error.message })

  // Confirming payment also confirms the booking.
  if (status === 'completed' && data?.booking_id) {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', data.booking_id)
  }

  return back({ ok: status })
}
