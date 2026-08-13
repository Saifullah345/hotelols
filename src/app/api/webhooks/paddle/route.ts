import { NextResponse } from 'next/server'
import { verifyPaddleWebhook } from '@/lib/paddle'
import { createAdminClient } from '@/lib/supabase/server'
import {
  applySubscription, resolveHotelId, periodEnd, notifyHotelAdmins, announcePlanChange,
} from '@/lib/paddle-sync'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature')

  const event = await verifyPaddleWebhook(rawBody, signature)
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const eventType = event.event_type as string
  const data      = event.data as Record<string, unknown>
  const admin     = await createAdminClient()

  // ── A subscription started, renewed, or changed plan ───────────────
  if (eventType === 'subscription.activated' ||
      eventType === 'subscription.created'   ||
      eventType === 'subscription.updated'   ||
      eventType === 'subscription.resumed') {
    const result = await applySubscription(admin, data)

    if (result.direction === 'upgrade' || result.direction === 'new') {
      // Bell notification + "your plan is upgraded" email.
      await announcePlanChange(admin, result)
    } else if (result.applied && result.planId && result.direction === 'downgrade') {
      // Hotels can't downgrade themselves — this came from Paddle or a super
      // admin, so it is reported rather than celebrated.
      await notifyHotelAdmins(
        admin, result.hotelId!,
        'Plan updated',
        `Your subscription is now on the ${result.planName ?? 'new'} plan.`,
      )
    }
  }

  // ── Cancelled: access continues until the paid period runs out ─────
  if (eventType === 'subscription.canceled') {
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      const expiresAt = periodEnd(data) ?? (data.canceled_at as string | null)
      await admin.from('hotels').update({
        subscription_status: 'canceled',
        ...(expiresAt ? { plan_expires_at: expiresAt } : {}),
      }).eq('id', hotelId)

      await notifyHotelAdmins(
        admin, hotelId,
        'Subscription cancelled',
        expiresAt
          ? `Your plan stays active until ${new Date(expiresAt).toLocaleDateString('en-GB')}, then your hotel will be hidden from guests.`
          : 'Your plan has been cancelled.',
      )
    }
  }

  if (eventType === 'subscription.paused') {
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      await admin.from('hotels').update({ subscription_status: 'paused' }).eq('id', hotelId)
    }
  }

  // ── Charge failed: Paddle retries, we warn ─────────────────────────
  if (eventType === 'subscription.past_due' || eventType === 'transaction.payment_failed') {
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      await admin.from('hotels').update({ subscription_status: 'past_due' }).eq('id', hotelId)
      await notifyHotelAdmins(
        admin, hotelId,
        'Payment failed',
        'We could not take your subscription payment. Update your payment method to keep your hotel listed.',
      )
    }
  }

  // ── Money received ─────────────────────────────────────────────────
  if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
    const result = await applySubscription(admin, data, { status: 'active' })
    // Announces only if this delivery is the one that moved the plan — the
    // subscription event above usually gets there first and this stays quiet.
    await announcePlanChange(admin, result)
  }

  return NextResponse.json({ received: true })
}
