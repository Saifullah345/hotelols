import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { verifyPaddleWebhook } from '@/lib/paddle'
import { createAdminClient } from '@/lib/supabase/server'
import { CACHE_TAGS } from '@/lib/cache'
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

  // ── A subscription started, renewed, changed plan, or began its trial ──
  if (eventType === 'subscription.activated' ||
      eventType === 'subscription.created'   ||
      eventType === 'subscription.updated'   ||
      eventType === 'subscription.trialing'  ||
      eventType === 'subscription.resumed') {
    const result = await applySubscription(admin, data)

    if (result.direction === 'upgrade' || result.direction === 'new') {
      // Bell notification + "your plan is upgraded" (or "trial started") email.
      await announcePlanChange(admin, result)
    } else if (result.applied && result.planId && result.direction === 'downgrade') {
      // Outside a trial a hotel can't downgrade itself — this came from Paddle
      // or a super admin, so it is reported rather than celebrated.
      await notifyHotelAdmins(
        admin, result.hotelId!,
        'Plan updated',
        `Your subscription is now on the ${result.planName ?? 'new'} plan.`,
      )
    }
  }

  // ── The trial ran out and Paddle took the first real payment ───────
  // Paddle sends this as a subscription.updated (trialing → active) plus the
  // transaction below, both of which are already handled; this only exists to
  // tell the hotel what just came off their card.
  if (eventType === 'subscription.activated') {
    const hotelId = await resolveHotelId(admin, data)
    const { data: hotel } = hotelId
      ? await admin.from('hotels').select('trial_used_at, trial_ends_at').eq('id', hotelId).maybeSingle()
      : { data: null }

    // Only when a trial actually preceded this activation.
    if (hotelId && hotel?.trial_used_at) {
      await notifyHotelAdmins(
        admin, hotelId,
        'Your free trial has ended',
        'Your trial is over and your subscription is now running as a paid plan. Nothing changes in your dashboard.',
      )
    }
  }

  // ── Cancelled: access continues until the paid period runs out ─────
  if (eventType === 'subscription.canceled') {
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      const scheduled = data.scheduled_change as { action?: string; effective_at?: string } | null | undefined
      const expiresAt = (scheduled?.action === 'cancel' ? scheduled.effective_at : null)
        ?? periodEnd(data)
        ?? (data.canceled_at as string | null)

      await admin.from('hotels').update({
        subscription_status: 'canceled',
        ...(expiresAt ? { plan_expires_at: expiresAt, subscription_cancel_at: expiresAt } : {}),
      }).eq('id', hotelId)
      revalidateTag(CACHE_TAGS.hotel(hotelId))

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
      revalidateTag(CACHE_TAGS.hotel(hotelId))
    }
  }

  // ── Charge failed: Paddle retries, we warn ─────────────────────────
  if (eventType === 'subscription.past_due' || eventType === 'transaction.payment_failed') {
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      await admin.from('hotels').update({ subscription_status: 'past_due' }).eq('id', hotelId)
      revalidateTag(CACHE_TAGS.hotel(hotelId))
      await notifyHotelAdmins(
        admin, hotelId,
        'Payment failed',
        'We could not take your subscription payment. Update your payment method to keep your hotel listed.',
      )
    }
  }

  // ── Money received ─────────────────────────────────────────────────
  if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
    // A trial checkout also produces a completed transaction — for 0.00. Forcing
    // 'active' there would end the trial the moment it started, so the status is
    // only overridden for a payment that actually took money.
    const totals = (data.details as { totals?: { grand_total?: string } } | undefined)?.totals
    const paid = Number(totals?.grand_total ?? '0') > 0

    const result = await applySubscription(
      admin, data,
      paid
        ? { status: 'active' }
        // Keep whatever the subscription events have already set; if nothing has
        // (this delivery arrived first), a 0.00 charge means a trial started.
        : { keepStatus: true, status: 'trialing' },
    )
    // Announces only if this delivery is the one that moved the plan — the
    // subscription event above usually gets there first and this stays quiet.
    await announcePlanChange(admin, result)
  }

  return NextResponse.json({ received: true })
}
