import { NextResponse } from 'next/server'
import { verifyPaddleWebhook } from '@/lib/paddle'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature')

  const event = await verifyPaddleWebhook(rawBody, signature)
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const eventType = event.event_type as string
  const data      = event.data as Record<string, unknown>

  const admin = await createAdminClient()

  // ── subscription.activated — new subscription started ──────────────────
  if (eventType === 'subscription.activated') {
    const customData   = (data.custom_data ?? {}) as Record<string, string>
    const hotelId      = customData.hotel_id
    const planId       = customData.plan_id
    const subscriptionId = data.id as string
    const customerId     = data.customer_id as string
    const status         = data.status as string

    if (hotelId) {
      await admin.from('hotels').update({
        plan_id:                planId ?? undefined,
        subscription_status:    status,
        paddle_subscription_id: subscriptionId,
        paddle_customer_id:     customerId,
        plan_activated_at:      new Date().toISOString(),
      }).eq('id', hotelId)
    }
  }

  // ── subscription.updated — plan changed / renewed ──────────────────────
  if (eventType === 'subscription.updated') {
    const subscriptionId = data.id as string
    const status         = data.status as string
    const customData     = (data.custom_data ?? {}) as Record<string, string>
    const planId         = customData.plan_id

    const { data: hotel } = await admin
      .from('hotels')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (hotel) {
      await admin.from('hotels').update({
        subscription_status: status,
        ...(planId ? { plan_id: planId } : {}),
      }).eq('id', hotel.id)
    }
  }

  // ── subscription.canceled ──────────────────────────────────────────────
  if (eventType === 'subscription.canceled') {
    const subscriptionId = data.id as string

    const { data: hotel } = await admin
      .from('hotels')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (hotel) {
      await admin.from('hotels').update({
        subscription_status: 'canceled',
      }).eq('id', hotel.id)
    }
  }

  // ── transaction.completed — one-time payment ───────────────────────────
  if (eventType === 'transaction.completed') {
    const customData = (data.custom_data ?? {}) as Record<string, string>
    const hotelId    = customData.hotel_id

    if (hotelId) {
      await admin.from('hotels').update({
        subscription_status: 'active',
        plan_activated_at:   new Date().toISOString(),
      }).eq('id', hotelId)
    }
  }

  return NextResponse.json({ received: true })
}
