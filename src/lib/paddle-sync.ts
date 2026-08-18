// Applying a Paddle subscription to a hotel.
//
// Two things call this: the webhook (Paddle pushes) and the confirm endpoint
// (the browser asks after checkout). They must agree, so the logic lives here
// once. Webhooks can't reach a local dev server at all, and even in production
// one can be missed or arrive late — the confirm path is what makes the plan
// land either way.

import { revalidateTag } from 'next/cache'
import type { createAdminClient } from '@/lib/supabase/server'
import { planDirection, type PlanDirection } from '@/lib/plan-tier'
import { sendEmail } from '@/lib/email/resend'
import { planUpgradedTemplate } from '@/lib/email/templates'
import { CACHE_TAGS } from '@/lib/cache'
import { UNSUBSCRIBED } from '@/lib/subscription'

type Admin = Awaited<ReturnType<typeof createAdminClient>>

/** End of the period the hotel has paid for. */
export function periodEnd(data: Record<string, unknown>): string | null {
  const current = data.current_billing_period as { ends_at?: string } | null | undefined
  const billing = data.billing_period as { ends_at?: string } | null | undefined
  return current?.ends_at ?? billing?.ends_at ?? (data.next_billed_at as string | null) ?? null
}

/**
 * End of the free trial on a payload, if it carries one.
 *
 * Paddle puts the trial window on the subscription item (`trial_dates`) and
 * makes the current billing period the same span, so while a subscription is
 * `trialing` the period end *is* the trial end.
 */
export function trialEnd(data: Record<string, unknown>): string | null {
  const items = (data.items ?? []) as Array<{ trial_dates?: { ends_at?: string } | null }>
  const fromItem = items.find(i => i?.trial_dates?.ends_at)?.trial_dates?.ends_at
  if (fromItem) return fromItem
  return data.status === 'trialing' ? periodEnd(data) : null
}

const time = (value: string | null | undefined): number | null => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
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
    // A plan has up to four prices: monthly and yearly, each with a trial-free
    // twin for hotels that have already used their free period.
    for (const column of [
      'paddle_price_id_monthly', 'paddle_price_id_yearly',
      'paddle_price_id_monthly_no_trial', 'paddle_price_id_yearly_no_trial',
    ] as const) {
      const { data: match } = await admin.from('plans').select(columns).eq(column, priceId).maybeSingle()
      if (match) {
        return {
          plan: match,
          planId: match.id,
          planName: match.name,
          cycle: column.includes('monthly') ? ('monthly' as const) : ('yearly' as const),
        }
      }
    }
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
  /** Set while the hotel is inside a free trial. */
  trialEndsAt?: string | null
  /** True when this payload is what started the trial. */
  trialStarted?: boolean
  status?: string
}

/**
 * Writes the plan, status and paid-until date onto the hotel.
 *
 * `status` is Paddle's own value so nothing has to be translated. A payload we
 * can't tie to a plan still updates the status — losing an existing assignment
 * because one field was missing would be worse than leaving it alone.
 *
 * Trials are pinned to the hotel, not to the subscription: once `trial_ends_at`
 * is set it is never pushed back. Changing plan on day 4 of 14 swaps the price
 * and leaves the same 10 days running, which is what makes a mid-trial upgrade
 * safe to offer.
 */
export async function applySubscription(
  admin: Admin,
  data: Record<string, unknown>,
  opts: {
    status?: string
    subscriptionId?: string | null
    hotelId?: string | null
    /**
     * Leave `subscription_status` as it is. Used for a transaction payload,
     * whose own `status` ("completed") describes the payment and not the
     * subscription — writing it would wipe out a running trial.
     */
    keepStatus?: boolean
  } = {},
): Promise<ApplyResult> {
  const hotelId = opts.hotelId ?? await resolveHotelId(admin, data)
  if (!hotelId) return { applied: false, reason: 'no hotel on the payload' }

  const { plan, planId, planName, cycle } = await resolvePlan(admin, data)
  const subscriptionId = opts.subscriptionId ?? (data.subscription_id as string | undefined) ?? (data.id as string | undefined)

  // Read what the hotel is leaving *before* writing the new state. The plan
  // comparison decides whether an upgrade gets announced, and it is also what
  // stops a second delivery of the same change from announcing it twice:
  // whichever of the webhook and the confirm call lands first moves plan_id, so
  // the other one sees no change and stays quiet.
  const { data: before } = await admin
    .from('hotels')
    .select('plan_id, subscription_status, trial_ends_at, trial_started_at, trial_used_at, plan_activated_at')
    .eq('id', hotelId)
    .maybeSingle()
  const { data: previousPlan } = before?.plan_id
    ? await admin.from('plans').select('*').eq('id', before.plan_id).maybeSingle()
    : { data: null }

  // `keepStatus` protects a running trial from a transaction payload, but it
  // must never keep "unsubscribed" — a hotel that has just paid is not
  // unsubscribed, and leaving that word in place would lock the dashboard it
  // just unlocked.
  const stored = before?.subscription_status
  const status = opts.keepStatus && stored && stored !== UNSUBSCRIBED
    ? stored
    : opts.status ?? (opts.keepStatus ? null : (data.status as string | undefined)) ?? 'active'

  const now = Date.now()
  const isTrialing = status === 'trialing'

  // ── The trial clock ────────────────────────────────────────────────
  // Kept as it was found whenever it is still running. Taking the earlier of
  // the two dates means neither a plan change nor a replayed webhook can push
  // the end date out: a trial can only ever be used up, never extended.
  const storedTrialEnd  = time(before?.trial_ends_at)
  // A transaction payload carries no trial_dates; when the caller has told us
  // this is a trial, its billing period is the trial window.
  const payloadTrialEnd = time(trialEnd(data)) ?? (isTrialing ? time(periodEnd(data)) : null)
  let trialEndsAt: string | null = before?.trial_ends_at ?? null
  let trialStarted = false

  if (isTrialing) {
    const runningStored = storedTrialEnd !== null && storedTrialEnd > now ? storedTrialEnd : null
    if (runningStored === null) {
      // No trial on record (or the last one has run out): this payload starts one.
      trialEndsAt = payloadTrialEnd ? new Date(payloadTrialEnd).toISOString() : null
      trialStarted = trialEndsAt !== null
    } else {
      const keep = payloadTrialEnd !== null ? Math.min(runningStored, payloadTrialEnd) : runningStored
      trialEndsAt = new Date(keep).toISOString()
    }
  }

  // While trialing, the date access runs to *is* the trial end. Paddle's own
  // period end says the same thing, but the stored value is what the countdown
  // in the dashboard reads, and the two must never disagree.
  const expiresAt = isTrialing ? (trialEndsAt ?? periodEnd(data)) : periodEnd(data)

  // A queued cancellation, so the billing page can name the date access stops
  // instead of leaving the hotel to guess. Only a subscription payload carries
  // the field — a transaction doesn't, and must not be read as "nothing is
  // scheduled" and wipe a cancellation the hotel has already asked for.
  const knowsSchedule = 'scheduled_change' in data
  const scheduled = data.scheduled_change as { action?: string; effective_at?: string } | null | undefined
  const cancelAt = scheduled?.action === 'cancel' ? (scheduled.effective_at ?? null) : null

  // Only stamped when the plan actually moves (or on the very first activation),
  // so "Since 3 March" keeps meaning the day this plan started rather than the
  // last time any webhook happened to arrive.
  const planMoved = Boolean(planId && planId !== before?.plan_id)
  const firstActivation = !before?.plan_activated_at

  const { error } = await admin.from('hotels').update({
    ...(planId ? { plan_id: planId } : {}),
    ...(cycle  ? { billing_cycle: cycle } : {}),
    ...(subscriptionId ? { paddle_subscription_id: subscriptionId } : {}),
    ...(data.customer_id ? { paddle_customer_id: data.customer_id as string } : {}),
    ...(expiresAt ? { plan_expires_at: expiresAt } : {}),
    ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
    ...(trialStarted ? {
      trial_started_at: before?.trial_started_at ?? new Date(now).toISOString(),
      // Never cleared: proof this hotel has had its one free period, so
      // cancelling and signing up again doesn't hand out another.
      trial_used_at:    before?.trial_used_at    ?? new Date(now).toISOString(),
    } : {}),
    subscription_status: status,
    ...(knowsSchedule ? { subscription_cancel_at: cancelAt } : {}),
    ...(planMoved || firstActivation ? { plan_activated_at: new Date(now).toISOString() } : {}),
  }).eq('id', hotelId)

  if (error) return { applied: false, reason: error.message }

  // The hotel-admin layout reads a 60-second cache. Without this a hotel that
  // has just paid keeps seeing the "choose a plan" lock for another minute.
  try { revalidateTag(CACHE_TAGS.hotel(hotelId)) } catch { /* outside a request scope */ }

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
    trialEndsAt: isTrialing ? trialEndsAt : null,
    trialStarted,
    status,
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

/** "in 14 days", the way the countdown banner says it. */
function daysFromNow(iso: string | null | undefined): number | null {
  const end = time(iso)
  return end === null ? null : Math.max(0, Math.ceil((end - Date.now()) / 86_400_000))
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
  const trialDays = result.trialStarted ? daysFromNow(result.trialEndsAt) : null

  await notifyHotelAdmins(
    admin,
    result.hotelId,
    trialDays !== null ? 'Your free trial has started'
      : upgraded ? 'Your plan is upgraded'
      : 'Plan activated',
    trialDays !== null
      ? `Your ${planName} trial is running — ${trialDays} day${trialDays === 1 ? '' : 's'} free. ` +
        'Your card is charged automatically when it ends, and you can change or cancel the plan any time before then.'
      : upgraded
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
