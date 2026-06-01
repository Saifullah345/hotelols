import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripeConfig() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeSecretKey || !stripeWebhookSecret) return null

  return {
    stripe: new Stripe(stripeSecretKey),
    stripeWebhookSecret,
  }
}

export async function POST(request: Request) {
  const stripeConfig = getStripeConfig()
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripeConfig.stripe.webhooks.constructEvent(body, sig, stripeConfig.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.booking_id

    if (bookingId) {
      await supabase.from('payments').update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      }).eq('booking_id', bookingId)

      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    await supabase.from('payments').update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', charge.payment_intent as string)
  }

  return NextResponse.json({ received: true })
}
