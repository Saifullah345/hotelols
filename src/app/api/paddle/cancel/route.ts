import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cancelPaddleSubscription, getPaddleSubscription } from '@/lib/paddle'
import { applySubscription, notifyHotelAdmins } from '@/lib/paddle-sync'
import { subscriptionIsTrialing } from '@/lib/plan-tier'
import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'

/**
 * Cancels the hotel's subscription.
 *
 * During a trial this is the "I've decided against it" button: nothing has been
 * charged and nothing will be, and the hotel keeps the days it was given. After
 * the trial the plan runs to the end of the period already paid for.
 *
 * The result is written here rather than left to the webhook — a local server
 * never receives one, and a hotel that pressed Cancel must not be shown an
 * active subscription afterwards.
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

  const admin = await createAdminClient()
  const { data: hotel } = await admin
    .from('hotels')
    .select('id, paddle_subscription_id, subscription_status, trial_ends_at, plan_expires_at')
    .eq('id', hotelId)
    .maybeSingle()

  if (!hotel?.paddle_subscription_id) {
    return NextResponse.json({ error: 'There is no subscription to cancel.' }, { status: 409 })
  }

  // The id is read from the hotel, never taken from the request: a subscription
  // id posted by hand must not be able to cancel somebody else's plan.
  const subscriptionId = hotel.paddle_subscription_id
  const trialing = subscriptionIsTrialing(hotel.subscription_status, hotel.trial_ends_at)

  const { ok, immediate, error } = await cancelPaddleSubscription(subscriptionId)
  if (!ok) {
    return NextResponse.json({ error: error ?? 'Paddle could not cancel the subscription' }, { status: 502 })
  }

  // Read the cancelled subscription back so the stored state is Paddle's, not a
  // guess: it carries the scheduled end date and the final status.
  const updated = await getPaddleSubscription(subscriptionId)
  let endsAt: string | null = hotel.plan_expires_at ?? null

  if (updated) {
    const payload = updated as unknown as Record<string, unknown>
    const result = await applySubscription(admin, payload, { hotelId })
    endsAt = result.expiresAt ?? endsAt
    // Paddle reports a subscription cancelled at period end as still active
    // with a scheduled change; one cancelled immediately comes back canceled.
    if (updated.scheduled_change?.action === 'cancel') {
      endsAt = updated.scheduled_change.effective_at
      await admin.from('hotels')
        .update({ subscription_status: 'canceled', plan_expires_at: endsAt, subscription_cancel_at: endsAt })
        .eq('id', hotelId)
    }
  } else {
    // Couldn't read it back: record the cancellation anyway rather than leave
    // the dashboard claiming an active plan.
    await admin.from('hotels').update({ subscription_status: 'canceled' }).eq('id', hotelId)
  }

  // An immediate cancellation ends access now, so nothing is left to run out.
  if (immediate) {
    endsAt = new Date().toISOString()
    await admin.from('hotels')
      .update({ subscription_status: 'canceled', plan_expires_at: endsAt, subscription_cancel_at: endsAt })
      .eq('id', hotelId)
  }

  try { revalidateTag(CACHE_TAGS.hotel(hotelId)) } catch { /* outside a request scope */ }

  const friendly = endsAt
    ? new Date(endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  await notifyHotelAdmins(
    admin, hotelId,
    'Subscription cancelled',
    immediate
      ? 'Your subscription has been cancelled. Nothing further will be charged — subscribe again whenever you are ready.'
      : friendly
        ? `Your plan stays active until ${friendly}, then your hotel will be hidden from guests. Nothing further will be charged.`
        : 'Your plan has been cancelled. Nothing further will be charged.',
  )

  return NextResponse.json({
    success: true,
    immediate,
    trialing,
    endsAt,
    message: immediate
      ? 'Subscription cancelled. Nothing has been charged.'
      : trialing
        ? `Cancelled. You keep access until ${friendly ?? 'your trial ends'}, and your card will not be charged.`
        : `Cancelled. You keep access until ${friendly ?? 'the end of the billing period'}.`,
  })
}
