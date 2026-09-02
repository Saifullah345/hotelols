import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateContact } from '@/lib/contact'

/**
 * Per-IP throttle. In memory, so it resets on deploy and is per-instance — good
 * enough to stop a script hammering the form, not a defence against a botnet.
 * The per-address check below is the one that survives a restart.
 */
const HITS = new Map<string, number[]>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5

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
      { error: 'Too many messages from this connection. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const result = validateContact((body ?? {}) as Record<string, string>)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Same address, three messages in ten minutes: almost always a double-click or
  // a bot, so stop it before the insert rather than filling the inbox.
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const { count } = await supabase
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('email', result.value.email)
    .gte('created_at', since)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'We already have your message and will reply shortly.' },
      { status: 429 }
    )
  }

  const { error } = await supabase.from('contact_messages').insert({
    full_name: result.value.full_name,
    email: result.value.email,
    phone: result.value.phone || null,
    topic: result.value.topic,
    message: result.value.message,
  })

  if (error) {
    // The sender cannot act on a Postgres error, and it may name columns.
    console.error('[contact] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
