import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!profile?.tenant_id || !['hotel_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { paymentId, amount } = await request.json()
  if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 })

  const { data: payment } = await supabase
    .from('payments')
    .select('id, hotel_id, amount, status, stripe_payment_intent_id')
    .eq('id', paymentId)
    .single()

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.hotel_id !== profile.tenant_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (payment.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed payments can be refunded' }, { status: 422 })
  }

  const refundAmt: number = typeof amount === 'number' ? amount : payment.amount
  if (refundAmt <= 0 || refundAmt > payment.amount) {
    return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 })
  }

  // For online payments with a Stripe payment intent, call Stripe first
  if (payment.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        // Stripe amounts are in the smallest currency unit (cents for USD)
        amount: Math.round(refundAmt * 100),
      })
      // The webhook will also flip status to 'refunded' via charge.refunded,
      // but we update the DB immediately so the UI reflects the change now.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe refund failed'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  const { error: dbErr } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', paymentId)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
