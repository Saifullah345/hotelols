import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) return null

  return new Stripe(stripeSecretKey)
}

export async function POST(request: Request) {
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id } = await request.json()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, hotel:hotels(name), room:rooms(room_number)')
    .eq('id', booking_id)
    .eq('user_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${(booking.hotel as { name?: string })?.name} — Room ${(booking.room as { room_number?: string })?.room_number}`,
          description: `Check-in: ${booking.check_in} | Check-out: ${booking.check_out}`,
        },
        unit_amount: Math.round(booking.total_amount * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/customer/bookings?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/customer/bookings?payment=cancelled`,
    metadata: { booking_id, user_id: user.id },
  })

  await supabase.from('payments').update({
    stripe_session_id: session.id,
    status: 'pending',
  }).eq('booking_id', booking_id)

  return NextResponse.json({ url: session.url })
}
