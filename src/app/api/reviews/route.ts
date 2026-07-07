import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')

  let query = supabase
    .from('reviews')
    .select('*, user:profiles(full_name)')
    .eq('user_id', user.id)

  if (bookingId) query = query.eq('booking_id', bookingId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { booking_id, hotel_id, rating, comment } = body

  if (!booking_id || !hotel_id || !rating) {
    return NextResponse.json({ error: 'booking_id, hotel_id and rating are required' }, { status: 400 })
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', booking_id)
    .eq('user_id', user.id)
    .eq('hotel_id', hotel_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status !== 'checked_out') {
    return NextResponse.json({ error: 'You can only review after check-out' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', booking_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You already reviewed this booking' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      hotel_id,
      user_id: user.id,
      rating,
      comment: comment ?? '',
    })
    .select('*, user:profiles(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
