import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['hotel_admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { conversation_id, message } = await request.json()
  if (!conversation_id || !message?.trim()) {
    return NextResponse.json({ error: 'conversation_id and message are required' }, { status: 400 })
  }

  // Verify conversation belongs to this hotel
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('id, wa_contact_id, hotel_id')
    .eq('id', conversation_id)
    .eq('hotel_id', profile.tenant_id!)
    .single()

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Get hotel WhatsApp credentials
  const { data: hotel } = await supabase
    .from('hotels')
    .select('whatsapp_phone_number_id, whatsapp_access_token')
    .eq('id', profile.tenant_id!)
    .single()

  if (!hotel?.whatsapp_phone_number_id || !hotel?.whatsapp_access_token) {
    return NextResponse.json({ error: 'WhatsApp not configured for this hotel' }, { status: 400 })
  }

  // Send via Meta API
  let waMessageId: string | null = null
  let sendStatus: 'sent' | 'failed' = 'failed'

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${hotel.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hotel.whatsapp_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: conv.wa_contact_id,
          type: 'text',
          text: { body: message },
        }),
      },
    )
    if (res.ok) {
      const json = await res.json()
      waMessageId = json?.messages?.[0]?.id ?? null
      sendStatus = 'sent'
    }
  } catch {
    // logged below via status = 'failed'
  }

  // Log outbound message
  const { data: logged } = await supabase.from('whatsapp_messages').insert({
    conversation_id,
    hotel_id: profile.tenant_id!,
    direction: 'outbound',
    content: message,
    wa_message_id: waMessageId,
    status: sendStatus,
  }).select().single()

  // Update conversation last_message_at
  await supabase
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation_id)

  if (sendStatus === 'failed') {
    return NextResponse.json({ error: 'Failed to send WhatsApp message', logged }, { status: 502 })
  }

  return NextResponse.json(logged, { status: 201 })
}
