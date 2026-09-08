import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isValidEmail } from '@/lib/validation'

/**
 * Per-IP throttle, mirroring /api/contact. In memory, so it resets on deploy and
 * is per-instance — enough to stop a script hammering the footer form. The
 * unique index on `email` is what stops the same address landing twice.
 */
const HITS = new Map<string, number[]>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 8

function tooManyFrom(ip: string): boolean {
  const now = Date.now()
  const recent = (HITS.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  HITS.set(ip, recent)

  // Drop idle senders so the map cannot grow without bound.
  if (HITS.size > 5000) {
    for (const [key, times] of HITS) {
      if (times.every(t => now - t >= WINDOW_MS)) HITS.delete(key)
    }
  }

  return recent.length > MAX_PER_WINDOW
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (tooManyFrom(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts from this connection. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = String((body as { email?: string })?.email ?? '').trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Please enter your email address' }, { status: 400 })
  }
  if (email.length > 254 || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Upsert rather than insert: someone who signs up twice should see the same
  // confirmation, not a duplicate-key error, and re-subscribing should clear an
  // earlier opt-out instead of being swallowed by the unique index.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert({ email, source: 'footer', unsubscribed: false }, { onConflict: 'email' })

  if (error) {
    // The subscriber cannot act on a Postgres error, and it may name columns.
    console.error('[newsletter] upsert failed:', error.message)
    return NextResponse.json({ error: 'Could not subscribe you. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
