'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check, Zap, CreditCard, RefreshCw, XCircle, Loader2, AlertTriangle,
  ArrowUp, ArrowDown, ArrowDownCircle, Lock, Sparkles, CalendarClock,
  X, MessageCircle, BedDouble, Users, Star,
} from 'lucide-react'
import { getPaddle, SUBSCRIPTION_EVENT } from '@/components/paddle/PaddleProvider'
import { createClient, getBrowserUser } from '@/lib/supabase/client'
import { planDirection, subscriptionIsLive, subscriptionIsTrialing } from '@/lib/plan-tier'
import { trialCountdown } from '@/lib/subscription'
import BillingHistory from './BillingHistory'

type Plan = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  paddle_price_id_monthly: string | null
  paddle_price_id_yearly: string | null
  tier_rank?: number | null
  trial_days?: number | null
}

type Hotel = {
  id: string
  name: string
  status?: string | null
  plan_id: string | null
  subscription_status: string | null
  paddle_subscription_id: string | null
  plan_activated_at: string | null
  plan_expires_at?: string | null
  billing_cycle?: string | null
  trial_ends_at?: string | null
  trial_used_at?: string | null
  subscription_cancel_at?: string | null
} | null

interface Props {
  hotel: Hotel
  currentPlan: Plan | null
  plans: Plan[]
}

const STATUS_BADGE: Record<string, string> = {
  active:       'bg-emerald-100 text-emerald-700',
  canceled:     'bg-red-100 text-red-700',
  past_due:     'bg-orange-100 text-orange-700',
  paused:       'bg-gray-100 text-gray-600',
  trialing:     'bg-indigo-100 text-indigo-700',
  unsubscribed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  trialing:     'Free trial',
  unsubscribed: 'No plan yet',
}

const asDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

const longDate = (value?: string | null) =>
  asDate(value)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) ?? null

/** Whole days from now, rounded up — the same arithmetic as the top banner. */
const daysFrom = (value?: string | null) => {
  const date = asDate(value)
  return date ? Math.ceil((date.getTime() - Date.now()) / 86_400_000) : null
}

export default function BillingClient({ hotel, currentPlan, plans }: Props) {
  const router = useRouter()
  const [billing, setBilling]   = useState<'monthly' | 'yearly'>(
    hotel?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
  )
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [resuming, setResuming]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [problems, setProblems] = useState<string[] | null>(null)
  // Asking before a downgrade or a billing-cycle switch, rather than acting on
  // a single click: both change what the hotel pays.
  const [downgradeTarget, setDowngradeTarget] = useState<Plan | null>(null)
  const [pendingCycle, setPendingCycle]       = useState<'monthly' | 'yearly' | null>(null)

  const hotelId = hotel?.id

  /** Asks the server what Paddle actually has configured, and lists what's wrong. */
  const checkSetup = async () => {
    setChecking(true)
    try {
      const res  = await fetch('/api/paddle/diagnostics')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not run the check'); return }
      setProblems(json.problems ?? [])
      if (!json.problems?.length) toast.success('Paddle setup looks correct')
    } catch {
      toast.error('Could not run the check')
    } finally {
      setChecking(false)
    }
  }

  /**
   * Pulls the subscription straight from Paddle and applies it.
   *
   * The webhook is the normal route, but it can't reach a local dev server and
   * can be missed in production — this is how a paid plan still lands.
   */
  const syncFromPaddle = async (opts: { quiet?: boolean } = {}) => {
    setSyncing(true)
    try {
      const res  = await fetch('/api/paddle/confirm', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (!opts.quiet) toast.error(json.error ?? 'Could not sync with Paddle')
        return
      }
      toast.success(
        json.trialStarted && json.planName
          ? `Your ${json.planName} trial is running`
          : json.upgraded && json.planName
            ? `Your plan is upgraded to ${json.planName}`
            : json.planName ? `Your plan is now ${json.planName}` : 'Subscription updated',
      )
      if (json.warning) toast.warning(json.warning)
      router.refresh()
    } catch {
      if (!opts.quiet) toast.error('Could not reach Paddle')
    } finally {
      setSyncing(false)
    }
  }

  // Checkout finished: the provider already confirmed it server-side, so all
  // that's left is to show the result and re-read the page.
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        ok?: boolean; planName?: string; error?: string; warning?: string
        upgraded?: boolean; trialStarted?: boolean; trialEndsAt?: string | null
      }
      if (detail?.ok) {
        const days = daysFrom(detail.trialEndsAt)
        toast.success(
          detail.trialStarted
            ? `Your ${detail.planName ?? ''} trial has started${days ? ` — ${days} days free` : ''}. Nothing has been charged yet.`
            : detail.upgraded && detail.planName
              ? `Your plan is upgraded to ${detail.planName} — a confirmation email is on its way`
              : detail.planName ? `Your plan is now ${detail.planName}` : 'Payment received — plan activated',
        )
        if (detail.warning) toast.warning(detail.warning)
        router.refresh()
      } else {
        toast.error(detail?.error ?? 'Payment went through, but the plan could not be applied. Try "Sync from Paddle".')
      }
    }
    window.addEventListener(SUBSCRIPTION_EVENT, onUpdated)
    return () => window.removeEventListener(SUBSCRIPTION_EVENT, onUpdated)
  }, [router])

  /** First purchase: opens Paddle's checkout on the price the server approves. */
  async function openCheckout(plan: Plan) {
    const paddle = getPaddle()
    if (!paddle) {
      toast.error('Payment system is loading, please try again in a moment.')
      return
    }

    const supabase = createClient()
    const user = await getBrowserUser(supabase)
    if (!user) { toast.error('Please sign in first'); return }

    setBusyPlanId(plan.id)
    try {
      // The server decides whether this move is allowed and which price to
      // open. Reading the price id straight off the plan here would make the
      // rules a matter of which buttons are on screen — and would hand a second
      // free trial to anyone who had already used one.
      const res = await fetch('/api/paddle/checkout-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, cycle: billing }),
      })
      const intent = await res.json().catch(() => ({}))

      // Already subscribed: this is a plan change, which moves the existing
      // subscription instead of buying a second one.
      if (res.status === 409 && intent.code === 'use_change_plan') {
        await changePlan(plan)
        return
      }
      if (!res.ok) {
        toast.error(intent.error ?? 'This plan change is not available.')
        return
      }

      await paddle.Checkout.open({
        items: [{ priceId: intent.priceId as string, quantity: 1 }],
        customer: { email: user.email! },
        customData: {
          hotel_id: hotelId,
          plan_id:  plan.id,
          user_id:  user.id,
        },
        settings: {
          theme: 'light',
        },
      })
    } catch (err) {
      console.error(err)
      toast.error('Could not open checkout. Please try again.')
    } finally {
      setBusyPlanId(null)
    }
  }

  /**
   * Moves a running subscription onto another plan.
   *
   * During the trial this is free and, crucially, keeps the same end date — the
   * server swaps the price without touching the billing period.
   */
  async function changePlan(plan: Plan) {
    const confirmed = trialing
      ? confirm(
          `Switch to ${plan.name}?\n\n` +
          `Your free trial keeps running to ${trialEndsOn ?? 'the same date'} — it does not start over, ` +
          'and nothing is charged until it ends.',
        )
      : confirm(
          `Upgrade to ${plan.name}?\n\n` +
          'The difference for the rest of this billing period will be charged to your card now.',
        )
    if (!confirmed) return

    setBusyPlanId(plan.id)
    try {
      const res = await fetch('/api/paddle/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, cycle: billing }),
      })
      const json = await res.json().catch(() => ({}))

      // The subscription went away underneath us (cancelled, or lapsed): fall
      // back to buying a fresh one rather than dead-ending.
      if (res.status === 409 && json.code === 'no_subscription') {
        toast.message('Starting a new subscription instead…')
        await openCheckout(plan)
        return
      }
      if (!res.ok) {
        toast.error(json.error ?? 'Could not change your plan.')
        return
      }

      toast.success(json.message ?? `You're on ${plan.name} now.`)
      if (json.warning) toast.warning(json.warning)
      router.refresh()
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusyPlanId(null)
    }
  }

  async function handleCancel() {
    if (!hotel?.paddle_subscription_id) return
    const message = trialing
      ? 'Cancel your free trial?\n\nYou keep access until the trial ends and your card will not be charged.'
      : 'Cancel your subscription?\n\nYou can keep using the plan until the end of the billing period.'
    if (!confirm(message)) return

    setCanceling(true)
    try {
      const res = await fetch('/api/paddle/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(json.message ?? 'Subscription cancelled.')
        router.refresh()
      } else {
        toast.error(json.error ?? 'Could not cancel. Please contact support.')
      }
    } catch {
      toast.error('Could not cancel. Please contact support.')
    } finally {
      setCanceling(false)
    }
  }

  async function handleResume() {
    if (!confirm(
      `Keep your ${currentPlan?.name ?? 'subscription'} plan?\n\n` +
      `Your card will be charged automatically when the trial ends. You can cancel any time before then.`,
    )) return

    setResuming(true)
    try {
      const res = await fetch('/api/paddle/resume', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Your ${json.planName ?? currentPlan?.name ?? 'subscription'} will continue after the trial.`)
        router.refresh()
      } else {
        toast.error(json.error ?? 'Could not resume the subscription. Please try "Sync from Paddle".')
      }
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setResuming(false)
    }
  }

  // ── Where this hotel stands ────────────────────────────────────────
  const live      = subscriptionIsLive(hotel?.subscription_status, hotel?.plan_expires_at)
  const trialing  = subscriptionIsTrialing(hotel?.subscription_status, hotel?.trial_ends_at)
  const subscribed = live && Boolean(hotel?.paddle_subscription_id)
  const neverSubscribed = hotel?.subscription_status === 'unsubscribed' || !hotel?.subscription_status

  const trialDaysLeft = trialing ? daysFrom(hotel?.trial_ends_at) : null
  const trialEndsOn   = longDate(hotel?.trial_ends_at)
  const renewsOn      = longDate(hotel?.plan_expires_at)
  const cancelsOn     = longDate(hotel?.subscription_cancel_at)

  // The trial on offer to a hotel that hasn't had one yet.
  const trialOnOffer = hotel?.trial_used_at
    ? 0
    : Math.max(0, ...plans.map(p => Number(p.trial_days ?? 0)))

  // While a paid subscription is live the plan can only move up the ladder.
  // Inside a trial nothing has been paid for, so any plan is fair game — trying
  // a different tier is what a trial is for.
  const upgradeOnly = live && !trialing

  const statusKey   = hotel?.subscription_status ?? ''
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey.replace('_', ' ')

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and payment details for {hotel?.name}</p>
      </div>

      {/* ── Trial countdown ── */}
      {trialing && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
              <Sparkles className="h-3.5 w-3.5" />
              {trialCountdown(trialDaysLeft)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-900">
                You&apos;re on a free trial of {currentPlan?.name ?? 'your plan'}
              </p>
              {cancelsOn ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-indigo-700">
                    Cancelled — access ends on {cancelsOn} and nothing will be charged.
                  </p>
                  <button
                    onClick={handleResume}
                    disabled={resuming}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 underline underline-offset-2 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {resuming ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {resuming ? 'Working…' : 'Keep plan →'}
                  </button>
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-indigo-700">
                  {trialEndsOn
                    ? `Ends on ${trialEndsOn}. Your card is charged automatically then, unless you cancel before.`
                    : 'Your card is charged automatically when the trial ends.'}
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-indigo-700">
            Changing plan during the trial keeps the same end date — the countdown carries on
            where it is rather than starting again.
          </p>
        </div>
      )}

      {/* ── Current plan card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {neverSubscribed ? 'Selected at signup' : 'Current Plan'}
            </p>
            <h3 className="text-xl font-bold text-gray-900 capitalize">
              {neverSubscribed
                ? currentPlan ? `${currentPlan.name} — not active yet` : 'No plan chosen'
                : currentPlan?.name ?? 'No active plan'}
            </h3>
            {currentPlan && (
              <p className="text-sm text-gray-500 mt-0.5">
                ${currentPlan.price_monthly}/month · ${currentPlan.price_yearly}/year
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hotel?.subscription_status && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[statusKey] ?? 'bg-gray-100 text-gray-600'}`}>
                {statusLabel}
              </span>
            )}
            {!neverSubscribed && hotel?.plan_activated_at && (
              <span className="text-xs text-gray-400">
                Since {new Date(hotel.plan_activated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* What happens next, and when. */}
        {subscribed && !trialing && renewsOn && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <CalendarClock className="h-4 w-4 text-gray-400" />
            {cancelsOn
              ? `Cancelled — your plan runs until ${cancelsOn}.`
              : `Renews on ${renewsOn}${hotel?.billing_cycle ? ` (${hotel.billing_cycle})` : ''}.`}
          </p>
        )}

        {neverSubscribed && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Your hotel is registered but nothing is running yet. Pick a plan below to open
              the dashboard
              {trialOnOffer > 0
                ? ` — the first ${trialOnOffer} days are free and your card isn't charged until the trial ends.`
                : '.'}
            </span>
          </div>
        )}

        {hotel?.status === 'pending' && subscribed && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Your subscription is running and the dashboard is fully open. Your hotel still needs
            approval from our team before it appears on the public site.
          </div>
        )}

        {hotel?.subscription_status === 'past_due' && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Your last payment failed. Please update your payment method to avoid service interruption.
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          {/* Paid but the plan still looks wrong? Pull the subscription
              straight from Paddle instead of waiting for a webhook that a
              local dev server can never receive. */}
          <button
            onClick={() => syncFromPaddle()}
            disabled={syncing}
            title="Fetch the latest subscription from Paddle and apply it"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Paddle'}
          </button>

          <button
            onClick={checkSetup}
            disabled={checking}
            title="Check what Paddle has configured for these plans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Check Paddle setup
          </button>

          {/* Un-cancel: shown only when the subscription has a scheduled cancellation. */}
          {trialing && cancelsOn && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors disabled:opacity-60"
            >
              {resuming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {resuming ? 'Working…' : 'Keep subscription'}
            </button>
          )}

          {/* Cancelling is offered during the trial too — a trial you can't get
              out of isn't one. */}
          {subscribed && !cancelsOn && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {trialing ? 'Cancel trial' : 'Cancel Subscription'}
            </button>
          )}
        </div>

        {/* Findings from the setup check — the actual reasons a payment came
            through as 0.00 or a plan didn't move. */}
        {problems !== null && (
          <div className="mt-4">
            {problems.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                Paddle setup looks correct — prices exist, trials match the plans, and the server is configured.
              </p>
            ) : (
              <ul className="space-y-2">
                {problems.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Plan selection ── */}
      <div id="plans">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {trialing ? 'Change Your Plan' : upgradeOnly ? 'Upgrade Your Plan' : 'Choose a Plan'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {trialing
                ? 'Switch to any plan while you\'re on trial — free, and your trial end date stays the same.'
                : upgradeOnly
                  ? 'You can move up to a higher plan at any time. To move to a lower plan, contact support.'
                  : trialOnOffer > 0
                    ? `Every plan starts with a ${trialOnOffer}-day free trial. Cancel any time before it ends and you won't be charged.`
                    : 'Pick the plan that fits your hotel.'}
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {(['monthly', 'yearly'] as const).map(b => (
              <button
                key={b}
                onClick={() => {
                  if (b === billing) return
                  // Only worth confirming when a live subscription makes the
                  // comparison real; otherwise the toggle is just a price view.
                  if (currentPlan && subscribed) setPendingCycle(b)
                  else setBilling(b)
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  billing === b ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {b === 'yearly' ? 'Yearly (save ~17%)' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isCurrent   = plan.id === hotel?.plan_id && !neverSubscribed
            // isCurrent but subscription is canceled/paused/expired → user needs to re-subscribe
            const isRenewable = isCurrent && !['active', 'trialing'].includes(hotel?.subscription_status ?? '')
            const price       = billing === 'monthly' ? plan.price_monthly : plan.price_yearly
            const priceId     = billing === 'monthly' ? plan.paddle_price_id_monthly : plan.paddle_price_id_yearly
            const hasPrice    = !!priceId
            // Same judgement as the server's, so a button is never offered for
            // a move the server would refuse. With no current plan on record
            // nothing is greyed out — the server still has the final say.
            const direction   = currentPlan && !neverSubscribed ? planDirection(currentPlan, plan) : 'upgrade'
            const blocked     = upgradeOnly && !isCurrent && direction !== 'upgrade'
            const trialDays   = Number(plan.trial_days ?? 0)
            // Only offered to a hotel that hasn't had its free period yet.
            const showsTrial  = trialDays > 0 && !hotel?.trial_used_at && !subscribed
            const busy        = busyPlanId === plan.id

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
                  isRenewable   ? 'border-amber-400 ring-2 ring-amber-100'
                  : isCurrent   ? 'border-primary-400 ring-2 ring-primary-100'
                  : blocked     ? 'border-gray-200 opacity-60'
                  : 'border-gray-200'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-white ${
                      isRenewable ? 'bg-amber-500' : 'bg-primary-600'
                    }`}>
                      <Zap className="h-3 w-3" />
                      {trialing ? 'On trial' : isRenewable ? 'Renew' : 'Current'}
                    </span>
                  </div>
                )}

                <h4 className="font-bold text-gray-900 text-lg capitalize">{plan.name}</h4>
                <div className="mt-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {price === 0 ? 'Free' : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-500 ml-1">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                  )}
                </div>

                {showsTrial ? (
                  <p className="mb-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    <Sparkles className="h-3 w-3" /> {trialDays}-day free trial
                  </p>
                ) : <div className="mb-4" />}

                <ul className="space-y-2 mb-5">
                  {(plan.features as string[]).slice(0, 5).map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent && !isRenewable ? (
                  trialing && cancelsOn ? (
                    <button
                      onClick={handleResume}
                      disabled={resuming}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resuming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {resuming ? 'Working…' : 'Keep plan'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-500 text-sm font-medium">
                      <RefreshCw className="h-4 w-4" /> {trialing ? 'Trialing this plan' : 'Active plan'}
                    </div>
                  )
                ) : isRenewable ? (
                  <button
                    onClick={() => openCheckout(plan)}
                    disabled={busy || !hasPrice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!hasPrice ? 'Price not configured — contact support' : `Resubscribe to ${plan.name}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {busy ? 'Working…' : 'Resubscribe'}
                  </button>
                ) : blocked ? (
                  <button
                    onClick={() => setDowngradeTarget(plan)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <ArrowDownCircle className="h-4 w-4 shrink-0" />
                    {direction === 'downgrade' ? 'Downgrade plan' : 'View details'}
                  </button>
                ) : (
                  <button
                    onClick={() => (subscribed ? changePlan(plan) : openCheckout(plan))}
                    disabled={busy || !hasPrice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!hasPrice ? 'Price not configured — contact support' : undefined}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : subscribed ? (
                      direction === 'downgrade' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {!hasPrice ? 'Contact Sales'
                      : busy ? 'Working…'
                      : trialing ? 'Switch to this plan'
                      : subscribed ? 'Upgrade'
                      : showsTrial ? `Start ${trialDays}-day free trial`
                      : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Billing cycle confirmation modal ── */}
      {pendingCycle && currentPlan && (() => {
        const toYearly   = pendingCycle === 'yearly'
        const monthly    = currentPlan.price_monthly
        const yearly     = currentPlan.price_yearly
        const annualNow  = monthly * 12
        const savings    = annualNow - yearly
        const perMonthYr = yearly / 12
        const nextDate   = hotel?.plan_expires_at
          ? new Date(hotel.plan_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : null

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPendingCycle(null)}
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setPendingCycle(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="px-6 pt-6 pb-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 pr-8">
                  Switch to {toYearly ? 'Annual' : 'Monthly'} Billing?
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {toYearly
                    ? 'Lock in a lower rate and pay once a year.'
                    : 'Switch back to paying month-to-month.'}
                </p>
              </div>

              {/* Price comparison */}
              <div className="px-6 py-5 space-y-3">

                {/* From → To */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-1">Current</p>
                    <p className="text-xl font-bold text-gray-900">
                      {toYearly ? `$${monthly}` : `$${yearly}`}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        /{toYearly ? 'mo' : 'yr'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {toYearly ? 'Billed monthly' : 'Billed annually'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                    <p className="text-[10px] font-bold text-primary-500 uppercase tracking-[0.08em] mb-1">New</p>
                    <p className="text-xl font-bold text-gray-900">
                      {toYearly ? `$${yearly}` : `$${monthly}`}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        /{toYearly ? 'yr' : 'mo'}
                      </span>
                    </p>
                    <p className="text-xs text-primary-500 mt-0.5">
                      {toYearly ? `$${perMonthYr.toFixed(2)}/mo equivalent` : 'Billed monthly'}
                    </p>
                  </div>
                </div>

                {/* Savings / details */}
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                  {toYearly && savings > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-600">You save</span>
                      <span className="text-sm font-bold text-emerald-600">${savings.toFixed(0)}/year</span>
                    </div>
                  )}
                  {toYearly && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-600">Annual cost</span>
                      <span className="text-sm font-semibold text-gray-900">${yearly}/year</span>
                    </div>
                  )}
                  {!toYearly && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-600">Monthly cost</span>
                      <span className="text-sm font-semibold text-gray-900">${monthly}/month</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {toYearly ? 'Amount due at checkout' : 'Due at next renewal'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {toYearly ? `$${yearly}` : `$${monthly}`}
                    </span>
                  </div>
                  {nextDate && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-600">Next billing date</span>
                      <span className="text-sm font-semibold text-gray-900">{nextDate}</span>
                    </div>
                  )}
                </div>

                {!toYearly && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    Switching to monthly billing will cost ${(annualNow - yearly).toFixed(0)} more per year compared to the annual plan.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => { setBilling(pendingCycle); setPendingCycle(null) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
                >
                  {toYearly ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                  {toYearly ? 'Switch to Annual' : 'Switch to Monthly'}
                </button>
                <button
                  onClick={() => setPendingCycle(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Downgrade modal ── */}
      {downgradeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDowngradeTarget(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setDowngradeTarget(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <ArrowDownCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Downgrade to {downgradeTarget.name}?
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Downgrades require a support request so we can review your usage and
                    make sure nothing is lost during the transition.
                  </p>
                </div>
              </div>
            </div>

            {/* Impact section */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.08em]">
                What to expect
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <BedDouble className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Room limit may decrease</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      If your current room count exceeds the lower plan&apos;s limit, you will need to
                      deactivate rooms before the downgrade takes effect.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Staff seats may be reduced</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Active staff members exceeding the lower plan&apos;s seat limit will need to
                      be removed or deactivated first.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Some features will be disabled</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Features not included in the{' '}
                      <span className="font-semibold capitalize">{downgradeTarget.name}</span> plan —
                      such as advanced reports, online booking, or housekeeping — will no longer
                      be accessible.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Your data is safe throughout this process. Our support team will guide you
                through any adjustments needed before switching you to the lower plan.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <a
                href={`mailto:support@hotelos.com?subject=Plan downgrade request — ${hotel?.name}&body=Hi,%0A%0AI would like to downgrade my plan from ${currentPlan?.name ?? 'current plan'} to ${downgradeTarget.name}.%0A%0AHotel: ${hotel?.name}%0AHotel ID: ${hotel?.id}%0A%0APlease guide me through the process.%0A%0AThank you`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Support
              </a>
              <button
                onClick={() => setDowngradeTarget(null)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
              >
                <Lock className="h-4 w-4" />
                Keep Current Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing History ── */}
      <BillingHistory
        hotelName={hotel?.name ?? 'Your Hotel'}
        nextBillingDate={hotel?.plan_expires_at ?? null}
        currentPlanName={currentPlan?.name ?? null}
      />
    </div>
  )
}
