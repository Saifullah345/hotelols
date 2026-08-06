import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  paddleConfigured, getPaddleTransaction, getPaddleSubscription,
  findPaddleCustomer, listPaddleSubscriptions,
} from '@/lib/paddle'
import { applySubscription, notifyHotelAdmins } from '@/lib/paddle-sync'

/**
 * Applies a Paddle subscription to the caller's hotel on demand.
 *
 * Webhooks are the normal path, but they can't reach a machine that isn't
 * publicly addressable — on localhost none ever arrive, so a paid plan would
 * never be assigned. The browser calls this the moment checkout completes, and
 * the billing page offers it as "Sync from Paddle" when something was missed.
 *
 * Everything is verified server-side against the Paddle API: the client only
 * supplies an id, never the plan or the dates.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (profile?.role !== 'hotel_admin' || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const hotelId = profile.tenant_id

  if (!paddleConfigured()) {
    return NextResponse.json(
      { error: 'Paddle is not configured on the server (PADDLE_API_KEY is missing).' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const transactionId  = typeof body.transactionId  === 'string' ? body.transactionId  : null
  const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId : null

  const admin = await createAdminClient()

  // ── 1. A transaction id from the checkout that just completed ──────
  if (transactionId) {
    const { data: txn, error } = await getPaddleTransaction(transactionId)
    if (error || !txn) {
      return NextResponse.json({ error: error ?? 'Transaction not found' }, { status: 404 })
    }

    // The transaction must belong to this hotel. Without this check any signed
    // in admin could claim somebody else's payment by guessing an id.
    const custom = (txn.custom_data ?? {}) as Record<string, string>
    if (custom.hotel_id && custom.hotel_id !== hotelId) {
      return NextResponse.json({ error: 'That payment belongs to another hotel' }, { status: 403 })
    }

    const subId = (txn.subscription_id as string | null) ?? null
    // Prefer the subscription: it carries the real billing period, where a
    // transaction only describes the one payment.
    if (subId) {
      const sub = await getPaddleSubscription(subId)
      if (sub) {
        const result = await applySubscription(admin, sub as unknown as Record<string, unknown>, { hotelId })
        return respond(result, admin)
      }
    }

    const result = await applySubscription(admin, txn, {
      hotelId,
      status: 'active',
      subscriptionId: subId,
    })
    return respond(result, admin)
  }

  // ── 2. An explicit subscription id ─────────────────────────────────
  if (subscriptionId) {
    const sub = await getPaddleSubscription(subscriptionId)
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    const custom = ((sub as unknown as Record<string, unknown>).custom_data ?? {}) as Record<string, string>
    if (custom.hotel_id && custom.hotel_id !== hotelId) {
      return NextResponse.json({ error: 'That subscription belongs to another hotel' }, { status: 403 })
    }

    const result = await applySubscription(admin, sub as unknown as Record<string, unknown>, { hotelId })
    return respond(result, admin)
  }

  // ── 3. Nothing given: find it from what we know ────────────────────
  // Used by the "Sync from Paddle" button when no webhook ever landed, so the
  // hotel has no ids stored at all.
  const { data: hotel } = await admin
    .from('hotels').select('paddle_customer_id, paddle_subscription_id').eq('id', hotelId).single()

  if (hotel?.paddle_subscription_id) {
    const sub = await getPaddleSubscription(hotel.paddle_subscription_id)
    if (sub) {
      const result = await applySubscription(admin, sub as unknown as Record<string, unknown>, { hotelId })
      return respond(result, admin)
    }
  }

  let customerId = hotel?.paddle_customer_id ?? null
  if (!customerId && user.email) {
    const { data: customer } = await findPaddleCustomer(user.email)
    customerId = customer?.id ?? null
  }
  if (!customerId) {
    return NextResponse.json(
      { error: 'No Paddle customer found for your account. Complete a checkout first.' },
      { status: 404 },
    )
  }

  const { data: subs } = await listPaddleSubscriptions(customerId)
  // The newest subscription that is actually live for this hotel.
  const match = (subs ?? []).find(s => {
    const custom = (s.custom_data ?? {}) as Record<string, string>
    return !custom.hotel_id || custom.hotel_id === hotelId
  })
  if (!match) {
    return NextResponse.json({ error: 'No subscription found for your account' }, { status: 404 })
  }

  const result = await applySubscription(admin, match, { hotelId })
  return respond(result, admin)
}

async function respond(
  result: Awaited<ReturnType<typeof applySubscription>>,
  admin: Awaited<ReturnType<typeof createAdminClient>>,
) {
  if (!result.applied) {
    return NextResponse.json({ error: result.reason ?? 'Could not apply the subscription' }, { status: 400 })
  }

  if (result.hotelId && result.planName) {
    await notifyHotelAdmins(
      admin, result.hotelId,
      'Plan activated',
      `Your subscription is now on the ${result.planName} plan.`,
    )
  }

  return NextResponse.json({
    success: true,
    planId: result.planId,
    planName: result.planName,
    expiresAt: result.expiresAt,
    // Set when the payment landed but no plan matched the price — the admin
    // needs to know the price id isn't on any plan rather than assume success.
    warning: result.reason,
  })
}
