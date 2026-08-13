// Applying a Paddle subscription to a hotel.
//
// Two things call this: the webhook (Paddle pushes) and the confirm endpoint
// (the browser asks after checkout). They must agree, so the logic lives here
// once. Webhooks can't reach a local dev server at all, and even in production
// one can be missed or arrive late — the confirm path is what makes the plan
// land either way.

import type { createAdminClient } from '@/lib/supabase/server'
import { planDirection, type PlanDirection } from '@/lib/plan-tier'
import { sendEmail } from '@/lib/email/resend'
import { planUpgradedTemplate } from '@/lib/email/templates'

type Admin = Awaited<ReturnType<typeof createAdminClient>>

/** End of the period the hotel has paid for. */
export function periodEnd(data: Record<string, unknown>): string | null {
  const current = data.current_billing_period as { ends_at?: string } | null | undefined
  const billing = data.billing_period as { ends_at?: string } | null | undefined
  return current?.ends_at ?? billing?.ends_at ?? (data.next_billed_at as string | null) ?? null
}

/**
 * Which plan a Paddle payload is for.
 *
 * The price id is authoritative — `custom_data` is written once at checkout and
 * goes stale after an upgrade made from Paddle's own dashboard.
 */
export async function resolvePlan(admin: Admin, data: Record<string, unknown>) {
  const custom = (data.custom_data ?? {}) as Record<string, string>
  const items  = (data.items ?? []) as Array<{ price?: { id?: string } | null; price_id?: string }>
  const priceId = items[0]?.price?.id ?? items[0]?.price_id

  // The whole row: the rank decides whether this is an upgrade, and the
  // features go into the email that announces one. `*` rather than a column
  // list because naming tier_rank would make every plan assignment fail on a
  // database where migration 032 hasn't been applied yet.
  const columns = '*'

  if (priceId) {
    const { data: byMonthly } = await admin
      .from('plans').select(columns).eq('paddle_price_id_monthly', priceId).maybeSingle()
    if (byMonthly) return { plan: byMonthly, planId: byMonthly.id, planName: byMonthly.name, cycle: 'monthly' as const }

    const { data: byYearly } = await admin
      .from('plans').select(columns).eq('paddle_price_id_yearly', priceId).maybeSingle()
    if (byYearly) return { plan: byYearly, planId: byYearly.id, planName: byYearly.name, cycle: 'yearly' as const }
  }

  if (custom.plan_id) {
    const { data: byCustom } = await admin
      .from('plans').select(columns).eq('id', custom.plan_id).maybeSingle()
    if (byCustom) return { plan: byCustom, planId: byCustom.id, planName: byCustom.name, cycle: null }
  }

  return { plan: null, planId: null, planName: null, cycle: null }
}

/** The hotel a payload belongs to: by custom data, else by subscription id. */
export async function resolveHotelId(admin: Admin, data: Record<string, unknown>): Promise<string | null> {
  const custom = (data.custom_data ?? {}) as Record<string, string>
  if (custom.hotel_id) return custom.hotel_id

  const subscriptionId = (data.subscription_id ?? data.id) as string | undefined
  if (!subscriptionId) return null

  const { data: hotel } = await admin
    .from('hotels').select('id').eq('paddle_subscription_id', subscriptionId).maybeSingle()
  return hotel?.id ?? null
}

export type ApplyResult = {
  applied: boolean
  hotelId?: string
  planId?: string | null
  planName?: string | null
  expiresAt?: string | null
  reason?: string
  /** Which way the plan moved, judged by `tier_rank`. */
  direction?: PlanDirection
  previousPlanName?: string | null
  billingCycle?: 'monthly' | 'yearly' | null
  /** Features of the new plan, for the announcement email. */
  planFeatures?: string[]
}

/**
 * Writes the plan, status and paid-until date onto the hotel.
 *
 * `status` is Paddle's own value so nothing has to be translated. A payload we
 * can't tie to a plan still updates the status — losing an existing assignment
 * because one field was missing would be worse than leaving it alone.
 */
export async function applySubscription(
  admin: Admin,
  data: Record<string, unknown>,
  opts: { status?: string; subscriptionId?: string | null; hotelId?: string | null } = {},
): Promise<ApplyResult> {
  const hotelId = opts.hotelId ?? await resolveHotelId(admin, data)
  if (!hotelId) return { applied: false, reason: 'no hotel on the payload' }

  const { plan, planId, planName, cycle } = await resolvePlan(admin, data)
  const expiresAt = periodEnd(data)
  const status = opts.status ?? (data.status as string | undefined) ?? 'active'
  const subscriptionId = opts.subscriptionId ?? (data.subscription_id as string | undefined) ?? (data.id as string | undefined)

  // Read the plan the hotel is leaving *before* writing the new one. The
  // comparison is what decides whether an upgrade gets announced, and it is
  // also what stops a second delivery of the same change from announcing it
  // twice: whichever of the webhook and the confirm call lands first moves
  // plan_id, so the other one sees no change and stays quiet.
  const { data: before } = await admin
    .from('hotels').select('plan_id').eq('id', hotelId).maybeSingle()
  const { data: previousPlan } = before?.plan_id
    ? await admin.from('plans').select('*').eq('id', before.plan_id).maybeSingle()
    : { data: null }

  const { error } = await admin.from('hotels').update({
    ...(planId ? { plan_id: planId } : {}),
    ...(cycle  ? { billing_cycle: cycle } : {}),
    ...(subscriptionId ? { paddle_subscription_id: subscriptionId } : {}),
    ...(data.customer_id ? { paddle_customer_id: data.customer_id as string } : {}),
    ...(expiresAt ? { plan_expires_at: expiresAt } : {}),
    subscription_status: status,
    plan_activated_at: new Date().toISOString(),
  }).eq('id', hotelId)

  if (error) return { applied: false, reason: error.message }

  return {
    applied: true,
    hotelId,
    planId,
    planName,
    expiresAt,
    // A payload with no plan attached leaves the assignment untouched, so
    // nothing moved on the ladder either.
    direction: planId ? planDirection(previousPlan, plan) : 'same',
    previousPlanName: previousPlan?.name ?? null,
    billingCycle: cycle,
    planFeatures: Array.isArray(plan?.features) ? (plan?.features as string[]) : [],
    reason: planId ? undefined : 'plan could not be matched to a Paddle price',
  }
}

/** Tells the hotel's admins what changed. Never throws — a missed note must not
 *  fail a webhook, or Paddle would retry and re-apply the change. */
export async function notifyHotelAdmins(admin: Admin, hotelId: string, title: string, message: string) {
  try {
    const { data: admins } = await admin
      .from('profiles').select('id').eq('role', 'hotel_admin').eq('tenant_id', hotelId)
    if (!admins?.length) return
    await admin.from('notifications').insert(
      admins.map(a => ({ user_id: a.id, hotel_id: hotelId, title, message, type: 'system' as const })),
    )
  } catch (e) {
    console.error('Failed to notify hotel admins:', e)
  }
}

/**
 * Announces the outcome of an applied subscription: a bell notification for
 * every admin of the hotel, plus an email when the plan actually moved up.
 *
 * Called from both the webhook and the confirm endpoint. Whichever runs first
 * is the one that sees a changed plan, so a single upgrade is announced once
 * even though both paths fire for the same checkout.
 *
 * Like `notifyHotelAdmins`, it never throws: a mail server having a bad day
 * must not fail a webhook and have Paddle retry the whole delivery.
 */
export async function announcePlanChange(admin: Admin, result: ApplyResult) {
  if (!result.applied || !result.hotelId || !result.planId) return
  if (result.direction !== 'upgrade' && result.direction !== 'new') return

  const planName = result.planName ?? 'new'
  const upgraded = result.direction === 'upgrade'

  await notifyHotelAdmins(
    admin,
    result.hotelId,
    upgraded ? 'Your plan is upgraded' : 'Plan activated',
    upgraded
      ? `Your plan has been upgraded${result.previousPlanName ? ` from ${result.previousPlanName}` : ''} to ${planName}. The new features are available now.`
      : `Your subscription is now on the ${planName} plan.`,
  )

  if (!upgraded) return

  try {
    const { data: hotel } = await admin
      .from('hotels').select('name').eq('id', result.hotelId).maybeSingle()

    const { data: recipients } = await admin
      .from('profiles').select('email').eq('role', 'hotel_admin').eq('tenant_id', result.hotelId)

    const to = (recipients ?? []).map(r => r.email).filter((e): e is string => Boolean(e))
    if (!to.length) return

    const { subject, html } = planUpgradedTemplate({
      hotelName: hotel?.name ?? 'Your hotel',
      planName,
      previousPlanName: result.previousPlanName,
      billingCycle: result.billingCycle ?? null,
      renewsAt: result.expiresAt ?? null,
      features: result.planFeatures,
    })
    await sendEmail({ to, subject, html })
  } catch (e) {
    // The plan is already applied and the in-app notice is out; the email is
    // the only thing lost, and it is not worth failing the request over.
    console.error('Failed to send plan upgrade email:', e)
  }
}
