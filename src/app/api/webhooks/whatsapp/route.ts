import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Meta WhatsApp Cloud API — webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// Meta WhatsApp Cloud API — incoming messages
export async function POST(request: Request) {
  const body = await request.json()

  // Meta sends a test ping that has no messages
  const entry = body?.entry?.[0]
  if (!entry) return NextResponse.json({ status: 'ok' })

  const change = entry?.changes?.[0]
  const value  = change?.value

  // Status updates (delivered/read) — acknowledge and skip
  if (value?.statuses?.length) return NextResponse.json({ status: 'ok' })

  const messages = value?.messages
  if (!messages?.length) return NextResponse.json({ status: 'ok' })

  const phoneNumberId: string = value?.metadata?.phone_number_id
  if (!phoneNumberId) return NextResponse.json({ status: 'ok' })

  // Service-role client — webhook runs outside user session
  const supabase = await createAdminClient()

  // Find the hotel by whatsapp_phone_number_id
  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, name, whatsapp_phone_number_id, whatsapp_access_token')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .single()

  if (!hotel) return NextResponse.json({ status: 'ok' }) // unconfigured hotel

  for (const msg of messages) {
    if (msg.type !== 'text') continue
    const waId: string   = msg.from   // sender phone, e.g. "966501234567"
    const text: string   = (msg.text?.body ?? '').trim()
    const waMessageId: string = msg.id

    // Upsert conversation
    let { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('hotel_id', hotel.id)
      .eq('wa_contact_id', waId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conv) {
      const { data: newConv } = await supabase
        .from('whatsapp_conversations')
        .insert({
          hotel_id: hotel.id,
          guest_phone: `+${waId}`,
          wa_contact_id: waId,
          bot_state: 'idle',
          bot_context: {},
        })
        .select()
        .single()
      conv = newConv
    } else {
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conv.id)
    }

    if (!conv) continue

    // Log inbound message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      hotel_id: hotel.id,
      direction: 'inbound',
      content: text,
      wa_message_id: waMessageId,
      status: 'delivered',
    })

    // Run bot
    const reply = await handleBotMessage(supabase, hotel, conv, text)
    if (!reply) continue

    // Send reply via Meta API
    const sent = await sendWhatsAppMessage(hotel.whatsapp_access_token!, phoneNumberId, waId, reply)

    // Log outbound message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      hotel_id: hotel.id,
      direction: 'outbound',
      content: reply,
      wa_message_id: sent?.messages?.[0]?.id ?? null,
      status: sent ? 'sent' : 'failed',
    })
  }

  return NextResponse.json({ status: 'ok' })
}

// ──────────────────────────────────────────────────────────────
// Bot state machine
// ──────────────────────────────────────────────────────────────
async function handleBotMessage(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  hotel: { id: string; name: string },
  conv: Record<string, unknown>,
  text: string,
): Promise<string | null> {
  const state   = (conv.bot_state as string) ?? 'idle'
  const ctx     = (conv.bot_context as Record<string, string>) ?? {}
  const lower   = text.toLowerCase()

  // Helper to persist new state
  const setState = async (newState: string, newCtx: Record<string, unknown> = {}) => {
    await supabase
      .from('whatsapp_conversations')
      .update({ bot_state: newState, bot_context: newCtx })
      .eq('id', conv.id as string)
  }

  // ── IDLE ──────────────────────────────────────────────────
  if (state === 'idle') {
    if (lower.includes('book') || lower.includes('room') || lower.includes('reserve') || lower.includes('1')) {
      await setState('awaiting_checkin', {})
      return `Welcome to *${hotel.name}*! 🏨\n\nPlease send your *check-in date* (YYYY-MM-DD).\nExample: ${new Date().toISOString().split('T')[0]}`
    }
    return `Hi! Welcome to *${hotel.name}*. 👋\n\nHow can I help you?\n\n1️⃣ Book a room\n\nReply with *1* or type *book* to get started.`
  }

  // ── AWAITING CHECK-IN ─────────────────────────────────────
  if (state === 'awaiting_checkin') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `Please enter a valid date in YYYY-MM-DD format.\nExample: ${new Date().toISOString().split('T')[0]}`
    }
    if (new Date(text) < new Date(new Date().toISOString().split('T')[0])) {
      return 'Check-in date cannot be in the past. Please enter a future date.'
    }
    await setState('awaiting_checkout', { check_in: text })
    return `Great! Now send your *check-out date* (YYYY-MM-DD).`
  }

  // ── AWAITING CHECK-OUT ────────────────────────────────────
  if (state === 'awaiting_checkout') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `Please enter a valid date in YYYY-MM-DD format.`
    }
    if (new Date(text) <= new Date(ctx.check_in)) {
      return 'Check-out must be after check-in. Please try again.'
    }
    const nights = Math.ceil(
      (new Date(text).getTime() - new Date(ctx.check_in).getTime()) / 86400000,
    )

    // Fetch available rooms
    const { data: bookedRoomIds } = await supabase
      .from('bookings')
      .select('room_id')
      .eq('hotel_id', hotel.id)
      .in('status', ['confirmed', 'checked_in'])
      .or(`check_in.lte.${text},check_out.gte.${ctx.check_in}`)

    const bookedIds = (bookedRoomIds ?? []).map((r: { room_id: string }) => r.room_id)

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, room_number, price_per_night, room_type:room_types(name)')
      .eq('hotel_id', hotel.id)
      .eq('status', 'available')
      .order('price_per_night')

    const available = (rooms ?? []).filter((r: { id: string }) => !bookedIds.includes(r.id))

    if (!available.length) {
      await setState('idle', {})
      return `Sorry, no rooms are available from *${ctx.check_in}* to *${text}* (${nights} night${nights !== 1 ? 's' : ''}). Please try different dates.`
    }

    const roomList = available.slice(0, 5).map((r: { room_number: string; price_per_night: number; room_type: { name?: string }[] | { name?: string } | null }, i: number) => {
      const typeName = Array.isArray(r.room_type) ? r.room_type[0]?.name : (r.room_type as { name?: string } | null)?.name
      return `${i + 1}️⃣ Room ${r.room_number} — ${typeName ?? 'Standard'} · $${r.price_per_night}/night`
    }).join('\n')

    const roomIds = available.slice(0, 5).map((r: { id: string }) => r.id)

    await setState('awaiting_room', { check_in: ctx.check_in, check_out: text, room_ids: JSON.stringify(roomIds), nights: String(nights) })
    return `Available rooms (${ctx.check_in} → ${text}, ${nights} night${nights !== 1 ? 's' : ''}):\n\n${roomList}\n\nReply with the *room number* (1–${available.slice(0, 5).length}) to select.`
  }

  // ── AWAITING ROOM SELECTION ───────────────────────────────
  if (state === 'awaiting_room') {
    const idx = parseInt(text, 10) - 1
    const roomIds: string[] = JSON.parse(ctx.room_ids ?? '[]')
    if (isNaN(idx) || idx < 0 || idx >= roomIds.length) {
      return `Please reply with a number between 1 and ${roomIds.length}.`
    }

    const selectedRoomId = roomIds[idx]
    const { data: room } = await supabase
      .from('rooms')
      .select('room_number, price_per_night, room_type:room_types(name)')
      .eq('id', selectedRoomId)
      .single()

    const nights = parseInt(ctx.nights ?? '1', 10)
    const total  = (room?.price_per_night ?? 0) * nights
    const typeName = Array.isArray(room?.room_type)
      ? room.room_type[0]?.name
      : (room?.room_type as { name?: string } | null | undefined)?.name

    await setState('confirming', {
      check_in: ctx.check_in,
      check_out: ctx.check_out,
      room_id: selectedRoomId,
      room_number: room?.room_number ?? '',
      room_type: typeName ?? 'Standard',
      total: String(total),
      nights: ctx.nights,
    })

    return `*Booking Summary* 📋\n\nRoom: ${room?.room_number} (${typeName})\nCheck-in: ${ctx.check_in}\nCheck-out: ${ctx.check_out}\nNights: ${nights}\n*Total: $${total}*\n\nReply *YES* to confirm or *NO* to start over.`
  }

  // ── CONFIRMING ────────────────────────────────────────────
  if (state === 'confirming') {
    if (lower === 'no' || lower === 'cancel') {
      await setState('idle', {})
      return `Booking cancelled. Type *book* anytime to start a new booking.`
    }

    if (lower === 'yes' || lower === 'confirm') {
      const nights = parseInt(ctx.nights ?? '1', 10)
      const { data: booking, error } = await supabase.from('bookings').insert({
        hotel_id: hotel.id,
        room_id: ctx.room_id,
        user_id: null,
        guest_name: null,
        guest_phone: conv.guest_phone as string,
        check_in: ctx.check_in,
        check_out: ctx.check_out,
        guests: 1,
        adults: 1,
        children: 0,
        status: 'confirmed',
        source: 'whatsapp',
        total_amount: parseFloat(ctx.total ?? '0'),
      }).select().single()

      if (error) {
        await setState('idle', {})
        return 'Sorry, we could not create your booking. Please try again or call us directly.'
      }

      await supabase
        .from('whatsapp_conversations')
        .update({ booking_id: booking.id, bot_state: 'idle', bot_context: {}, status: 'open' })
        .eq('id', conv.id as string)

      return `✅ *Booking Confirmed!*\n\nBooking ID: ${booking.id.slice(0, 8).toUpperCase()}\nRoom: ${ctx.room_number} (${ctx.room_type})\nCheck-in: ${ctx.check_in}\nCheck-out: ${ctx.check_out}\nTotal: $${ctx.total}\n\nPayment will be collected at the hotel. See you soon! 🏨`
    }

    return `Please reply *YES* to confirm or *NO* to cancel.`
  }

  return null
}

// ──────────────────────────────────────────────────────────────
// Send a WhatsApp text message via Meta Cloud API
// ──────────────────────────────────────────────────────────────
async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  message: string,
) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      },
    )
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}
