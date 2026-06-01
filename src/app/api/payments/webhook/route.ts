import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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
