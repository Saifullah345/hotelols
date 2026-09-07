import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { stripHtml } from '@/lib/sanitize'

/** One review per stay — said the same way whichever check catches it. */
const ALREADY_REVIEWED = 'You have already reviewed this booking.'

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

  // Validate and clean the review comment
  const rawComment = typeof comment === 'string' ? comment : ''
  const cleanComment = stripHtml(rawComment)
    .replace(/[^a-zA-ZÀ-ɏ\s.,!?'"():;\-]/g, '')  // same allowlist as client
    .trim()

  if (!cleanComment) {
    return NextResponse.json({ error: 'Please write your feedback before submitting' }, { status: 400 })
  }
  if (cleanComment.length < 10) {
    return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
  }
  if (cleanComment.length > 500) {
    return NextResponse.json({ error: 'Review is too long (max 500 characters)' }, { status: 400 })
  }
  if (!/[a-zA-ZÀ-ɏ]/.test(cleanComment)) {
    return NextResponse.json({ error: 'Review must contain meaningful text' }, { status: 400 })
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

  // Read the existing review with the service-role client, not the caller's.
  // `reviews` is UNIQUE(booking_id), but the guest's RLS view only shows
  // published reviews and their own — a review the hotel has unpublished, or one
  // left under another account on the same stay, is invisible here. The check
  // then passed, the insert hit the unique index, and the guest was shown
  // "duplicate key value violates unique constraint reviews_booking_id_key".
  const admin = await createAdminClient()
  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('booking_id', booking_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: ALREADY_REVIEWED }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id,
      hotel_id,
      user_id: user.id,
      rating,
      comment: cleanComment,
    })
    .select('*, user:profiles(full_name)')
    .single()

  if (error) {
    // 23505 = unique violation. The check above lost a race with a second
    // submit (a double tap sends two requests that both find nothing), so the
    // outcome is the same as finding the row: this stay is already reviewed.
    if (error.code === '23505') {
      return NextResponse.json({ error: ALREADY_REVIEWED }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save your review. Please try again.' }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
