'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Zap, CreditCard, RefreshCw, XCircle, Loader2, AlertTriangle, ArrowUp, Lock } from 'lucide-react'
import { getPaddle, SUBSCRIPTION_EVENT } from '@/components/paddle/PaddleProvider'
import { createClient } from '@/lib/supabase/client'
import { planDirection, subscriptionIsLive } from '@/lib/plan-tier'

type Plan = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  paddle_price_id_monthly: string | null
  paddle_price_id_yearly: string | null
  tier_rank?: number | null
}

type Hotel = {
  id: string
  name: string
  plan_id: string | null
  subscription_status: string | null
  paddle_subscription_id: string | null
  plan_activated_at: string | null
  plan_expires_at?: string | null
} | null

interface Props {
  hotel: Hotel
  currentPlan: Plan | null
  plans: Plan[]
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  canceled:  'bg-red-100 text-red-700',
  past_due:  'bg-orange-100 text-orange-700',
  paused:    'bg-gray-100 text-gray-600',
  trialing:  'bg-blue-100 text-blue-700',
}

export default function BillingClient({ hotel, currentPlan, plans }: Props) {
  const router = useRouter()
  const [billing, setBilling]   = useState<'monthly' | 'yearly'>('monthly')
  const [busy, setBusy]         = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [problems, setProblems] = useState<string[] | null>(null)

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
        json.upgraded && json.planName
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
        ok?: boolean; planName?: string; error?: string; warning?: string; upgraded?: boolean
      }
      if (detail?.ok) {
        toast.success(
          detail.upgraded && detail.planName
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

  async function openCheckout(plan: Plan) {
    const paddle = getPaddle()
    if (!paddle) {
      toast.error('Payment system is loading, please try again in a moment.')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Please sign in first'); return }

    setBusy(true)
    try {
      // The server decides whether this move is allowed and which price to
      // open. Reading the price id straight off the plan here would make the
      // upgrade-only rule a matter of which buttons are on screen.
      const res = await fetch('/api/paddle/checkout-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, cycle: billing }),
      })
      const intent = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(intent.error ?? 'This plan change is not available.')
        return
      }
      const priceId: string = intent.priceId

      await paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email! },
        customData: {
          hotel_id: hotelId,
          plan_id:  plan.id,
          user_id:  user.id,
        },
        settings: {
          successUrl: `${window.location.origin}/hotel-admin/billing?success=1`,
          theme: 'light',
        },
      })
    } catch (err) {
      console.error(err)
      toast.error('Could not open checkout. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!hotel?.paddle_subscription_id) return
    if (!confirm('Cancel your subscription? You can keep using the plan until the end of the billing period.')) return
    setCanceling(true)
    try {
      const res = await fetch('/api/paddle/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: hotel.paddle_subscription_id }),
      })
      if (res.ok) {
        toast.success('Subscription will be canceled at the end of the billing period.')
      } else {
        toast.error('Could not cancel. Please contact support.')
      }
    } catch {
      toast.error('Could not cancel. Please contact support.')
    } finally {
      setCanceling(false)
    }
  }

  const isActive = hotel?.subscription_status === 'active'

  // While a subscription is live the plan can only move up the ladder. A hotel
  // that never paid, or whose plan has lapsed, is choosing from scratch and
  // sees every plan open — the same rule the server applies.
  const upgradeOnly = subscriptionIsLive(hotel?.subscription_status, hotel?.plan_expires_at)

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and payment details for {hotel?.name}</p>
      </div>

      {/* ── Current plan card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Current Plan</p>
            <h3 className="text-xl font-bold text-gray-900 capitalize">
              {currentPlan?.name ?? 'No active plan'}
            </h3>
            {currentPlan && (
              <p className="text-sm text-gray-500 mt-0.5">
                ${currentPlan.price_monthly}/month · ${currentPlan.price_yearly}/year
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hotel?.subscription_status && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[hotel.subscription_status] ?? 'bg-gray-100 text-gray-600'}`}>
                {hotel.subscription_status.replace('_', ' ')}
              </span>
            )}
            {hotel?.plan_activated_at && (
              <span className="text-xs text-gray-400">
                Since {new Date(hotel.plan_activated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

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

          {isActive && hotel?.paddle_subscription_id && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Findings from the setup check — the actual reasons a payment came
            through as 0.00 or a plan didn't move. */}
        {problems !== null && (
          <div className="mt-4">
            {problems.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                Paddle setup looks correct — prices exist, none carry a free trial, and the server is configured.
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
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {upgradeOnly ? 'Upgrade Your Plan' : 'Choose a Plan'}
            </h3>
            {upgradeOnly && (
              <p className="text-sm text-gray-500 mt-0.5">
                You can move up to a higher plan at any time. To move to a lower plan, contact support.
              </p>
            )}
          </div>

          {/* Billing toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {(['monthly', 'yearly'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
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
            const isCurrent   = plan.id === hotel?.plan_id
            const price       = billing === 'monthly' ? plan.price_monthly : plan.price_yearly
            const priceId     = billing === 'monthly' ? plan.paddle_price_id_monthly : plan.paddle_price_id_yearly
            const hasPrice    = !!priceId
            // Same judgement as the server's, so a button is never offered for
            // a move the checkout guard would refuse. With no current plan on
            // record nothing is greyed out — the server still has the final say.
            const direction   = currentPlan ? planDirection(currentPlan, plan) : 'upgrade'
            const blocked     = upgradeOnly && !isCurrent && direction !== 'upgrade'

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
                  isCurrent ? 'border-primary-400 ring-2 ring-primary-100' : blocked ? 'border-gray-200 opacity-60' : 'border-gray-200'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-600 text-white text-[11px] font-bold uppercase tracking-wide">
                      <Zap className="h-3 w-3" /> Current
                    </span>
                  </div>
                )}

                <h4 className="font-bold text-gray-900 text-lg capitalize">{plan.name}</h4>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {price === 0 ? 'Free' : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-500 ml-1">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                  )}
                </div>

                <ul className="space-y-2 mb-5">
                  {(plan.features as string[]).slice(0, 5).map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-500 text-sm font-medium">
                    <RefreshCw className="h-4 w-4" /> Active plan
                  </div>
                ) : blocked ? (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-400 text-sm font-medium cursor-not-allowed"
                    title={`Your ${currentPlan?.name ?? 'current'} plan can only be changed to a higher plan. Contact support to move down a tier.`}
                  >
                    <Lock className="h-4 w-4" />
                    {direction === 'downgrade' ? 'Lower than your plan' : 'Not an upgrade'}
                  </div>
                ) : (
                  <button
                    onClick={() => openCheckout(plan)}
                    disabled={busy || !hasPrice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!hasPrice ? 'Price not configured — contact support' : undefined}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : upgradeOnly ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {!hasPrice ? 'Contact Sales' : upgradeOnly ? 'Upgrade' : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
