import { NextResponse } from 'next/server'
import { verifyPaddleWebhook } from '@/lib/paddle'
import { createAdminClient } from '@/lib/supabase/server'

type Admin = Awaited<ReturnType<typeof createAdminClient>>

/** End of the period the hotel has paid for. */
function periodEnd(data: Record<string, unknown>): string | null {
  const period = data.current_billing_period as { ends_at?: string } | null | undefined
  return period?.ends_at ?? (data.next_billed_at as string | null) ?? null
}

/** Which of our plans this subscription is for, and on what cycle. */
async function resolvePlan(admin: Admin, data: Record<string, unknown>) {
  const custom = (data.custom_data ?? {}) as Record<string, string>
  const items  = (data.items ?? []) as Array<{ price?: { id?: string } }>
  const priceId = items[0]?.price?.id

  if (priceId) {
    // The price is the authoritative link — custom_data can be stale after an
    // upgrade done from Paddle's own dashboard.
    const { data: byMonthly } = await admin
      .from('plans').select('id').eq('paddle_price_id_monthly', priceId).maybeSingle()
    if (byMonthly) return { planId: byMonthly.id, cycle: 'monthly' as const }

    const { data: byYearly } = await admin
      .from('plans').select('id').eq('paddle_price_id_yearly', priceId).maybeSingle()
    if (byYearly) return { planId: byYearly.id, cycle: 'yearly' as const }
  }

  return { planId: custom.plan_id ?? null, cycle: null }
}

/** The hotel this event belongs to: by subscription id, else by custom data. */
async function resolveHotelId(admin: Admin, data: Record<string, unknown>): Promise<string | null> {
  const custom = (data.custom_data ?? {}) as Record<string, string>
  if (custom.hotel_id) return custom.hotel_id

  const subscriptionId = (data.subscription_id ?? data.id) as string | undefined
  if (!subscriptionId) return null

  const { data: hotel } = await admin
    .from('hotels').select('id').eq('paddle_subscription_id', subscriptionId).maybeSingle()
  return hotel?.id ?? null
}

/** Tells the hotel's admins what just happened to their subscription. */
async function notifyHotelAdmins(admin: Admin, hotelId: string, title: string, message: string) {
  try {
    const { data: admins } = await admin
      .from('profiles').select('id').eq('role', 'hotel_admin').eq('tenant_id', hotelId)
    if (!admins?.length) return
    await admin.from('notifications').insert(
      admins.map(a => ({
        user_id: a.id,
        hotel_id: hotelId,
        title,
        message,
        type: 'system' as const,
      })),
    )
  } catch (e) {
    // A missed notification must never fail the webhook — Paddle would retry
    // and we'd re-apply the subscription change.
    console.error('Failed to notify hotel admins:', e)
  }
}

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
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      const { planId, cycle } = await resolvePlan(admin, data)
      const expiresAt = periodEnd(data)

      const { data: before } = await admin
        .from('hotels').select('plan_id').eq('id', hotelId).single()

      await admin.from('hotels').update({
        // The plan only moves when we could work out which one it is — a
        // partial event must not wipe an existing assignment.
        ...(planId ? { plan_id: planId } : {}),
        ...(cycle  ? { billing_cycle: cycle } : {}),
        subscription_status:    data.status as string,
        paddle_subscription_id: data.id as string,
        paddle_customer_id:     data.customer_id as string,
        plan_expires_at:        expiresAt,
        plan_activated_at:      new Date().toISOString(),
      }).eq('id', hotelId)

      if (planId && before?.plan_id && before.plan_id !== planId) {
        const { data: plan } = await admin.from('plans').select('name').eq('id', planId).single()
        await notifyHotelAdmins(
          admin, hotelId,
          'Plan updated',
          `Your subscription is now on the ${plan?.name ?? 'new'} plan.`,
        )
      }
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
    const hotelId = await resolveHotelId(admin, data)
    if (hotelId) {
      const { planId, cycle } = await resolvePlan(admin, data)
      // A transaction carries the period it paid for on its billing_period.
      const billing = data.billing_period as { ends_at?: string } | null | undefined

      await admin.from('hotels').update({
        subscription_status: 'active',
        ...(planId  ? { plan_id: planId } : {}),
        ...(cycle   ? { billing_cycle: cycle } : {}),
        ...(billing?.ends_at ? { plan_expires_at: billing.ends_at } : {}),
        plan_activated_at: new Date().toISOString(),
      }).eq('id', hotelId)
    }
  }

  return NextResponse.json({ received: true })
}
