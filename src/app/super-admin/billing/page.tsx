import Link from 'next/link'
import {
  TrendingUp, Users, CheckCircle2, Gift, AlertTriangle,
  XCircle, Building2, Activity, Zap, Clock, Calendar,
  CreditCard, DollarSign, PauseCircle, ArrowRight,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import SubscriptionsTable, { type HotelRow } from './SubscriptionsTable'

export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────────────

type PlanRow = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  tier_rank: number | null
  is_active: boolean
}

type PaymentSummary = { status: string; amount: number }

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchBillingData() {
  const admin = await createAdminClient()

  const [{ data: hotelsRaw }, { data: plansRaw }, { data: paymentsRaw }] = await Promise.all([
    admin
      .from('hotels')
      .select(`
        id, name, city, country,
        subscription_status, billing_cycle,
        plan_expires_at, trial_ends_at, trial_started_at, plan_activated_at,
        subscription_cancel_at, paddle_subscription_id, paddle_customer_id,
        plan_id, created_at,
        plan:plans(id, name, price_monthly, price_yearly, tier_rank)
      `)
      .order('created_at', { ascending: false }),

    admin
      .from('plans')
      .select('id, name, price_monthly, price_yearly, tier_rank, is_active')
      .order('tier_rank', { ascending: true }),

    admin.from('payments').select('status, amount'),
  ])

  const hotels = (hotelsRaw ?? []) as unknown as HotelRow[]
  const plans  = (plansRaw  ?? []) as PlanRow[]
  const payments = (paymentsRaw ?? []) as PaymentSummary[]

  const now      = new Date()
  const in7Days  = new Date(now.getTime() +  7 * 86_400_000)
  const in30Days = new Date(now.getTime() + 30 * 86_400_000)

  // ── Status groups ──────────────────────────────────────────────────────────
  const active       = hotels.filter(h => h.subscription_status === 'active')
  const trialing     = hotels.filter(h => h.subscription_status === 'trialing')
  const pastDue      = hotels.filter(h => h.subscription_status === 'past_due')
  const paused       = hotels.filter(h => h.subscription_status === 'paused')
  const cancelled    = hotels.filter(h => h.subscription_status === 'canceled')
  const unsubscribed = hotels.filter(h => !h.subscription_status || h.subscription_status === 'unsubscribed')

  // ── MRR / ARR ─────────────────────────────────────────────────────────────
  const mrr = active.reduce((sum, h) => {
    const p = h.plan; if (!p) return sum
    return sum + (h.billing_cycle === 'yearly' ? p.price_yearly / 12 : p.price_monthly)
  }, 0)

  const trialMrr = trialing.reduce((sum, h) => {
    const p = h.plan; if (!p) return sum
    return sum + p.price_monthly
  }, 0)

  // ── Expiry alerts ──────────────────────────────────────────────────────────
  const expiringTrials = trialing.filter(h =>
    h.trial_ends_at &&
    new Date(h.trial_ends_at) >= now &&
    new Date(h.trial_ends_at) <= in7Days,
  )

  const upcomingRenewals = active.filter(h =>
    h.plan_expires_at &&
    new Date(h.plan_expires_at) >= now &&
    new Date(h.plan_expires_at) <= in30Days,
  )

  // ── Revenue by plan ────────────────────────────────────────────────────────
  const revenueByPlan = plans
    .filter(p => p.is_active)
    .map(plan => {
      const onPlanActive   = active.filter(h => h.plan_id === plan.id)
      const onPlanTrialing = trialing.filter(h => h.plan_id === plan.id)
      const planMrr = onPlanActive.reduce((sum, h) =>
        sum + (h.billing_cycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly), 0)
      return { ...plan, activeCount: onPlanActive.length, trialingCount: onPlanTrialing.length, mrr: planMrr }
    })
    .filter(p => p.activeCount > 0 || p.trialingCount > 0)

  const maxPlanMrr = Math.max(...revenueByPlan.map(p => p.mrr), 1)

  // ── Booking payment totals ─────────────────────────────────────────────────
  const sumBy = (s: string) =>
    payments.filter(p => p.status === s).reduce((t, p) => t + p.amount, 0)

  const bookingStats = {
    paid:     sumBy('completed'),
    pending:  sumBy('pending'),
    failed:   sumBy('failed'),
    refunded: sumBy('refunded'),
  }

  return {
    hotels,
    plans,
    stats: {
      totalHotels: hotels.length,
      active: active.length,
      trialing: trialing.length,
      pastDue: pastDue.length,
      paused: paused.length,
      cancelled: cancelled.length,
      unsubscribed: unsubscribed.length,
      mrr,
      arr: mrr * 12,
      trialMrr,
    },
    expiringTrials,
    upcomingRenewals,
    pastDueHotels: pastDue,
    revenueByPlan,
    maxPlanMrr,
    bookingStats,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, iconBg, iconColor, accent,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; iconBg: string; iconColor: string; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 ${accent ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <p className={`text-3xl font-black ${accent ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BillingPage() {
  const {
    hotels, stats,
    expiringTrials, upcomingRenewals, pastDueHotels,
    revenueByPlan, maxPlanMrr,
    bookingStats,
  } = await fetchBillingData()

  // Action center items
  type ActionItem = { hotel: HotelRow; label: string; urgency: 'high' | 'medium' | 'low' }
  const actions: ActionItem[] = [
    ...pastDueHotels.map(h => ({ hotel: h, label: 'Payment past due',                           urgency: 'high'   as const })),
    ...expiringTrials.map(h => ({ hotel: h, label: `Trial expires in ${daysUntil(h.trial_ends_at!)} day(s)`, urgency: 'medium' as const })),
    ...upcomingRenewals.map(h => ({ hotel: h, label: `Renews in ${daysUntil(h.plan_expires_at!)} day(s)`,    urgency: 'low'    as const })),
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide subscriptions, revenue, and billing health</p>
        </div>
        <Link
          href="/super-admin/plans"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <CreditCard className="h-4 w-4" /> Manage Plans
        </Link>
      </div>

      {/* ── MRR hero + status KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

        {/* MRR — spans 2 cols */}
        <div className="col-span-2 rounded-2xl border border-indigo-100 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">MRR</span>
          </div>
          <p className="text-4xl font-black text-gray-900">{usd(stats.mrr)}</p>
          <p className="text-sm text-gray-500 mt-1">
            ARR <span className="font-semibold text-gray-700">{usd(stats.arr)}</span>
          </p>
          {stats.trialMrr > 0 && (
            <p className="text-xs text-indigo-600 mt-2 font-medium">
              +{usd(stats.trialMrr)} potential from {stats.trialing} trial{stats.trialing !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <KpiCard label="Active subscriptions" value={stats.active}       icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard label="Active trials"         value={stats.trialing}    icon={Gift}          iconBg="bg-indigo-50"  iconColor="text-indigo-600"
          sub={expiringTrials.length > 0 ? `${expiringTrials.length} expiring this week` : undefined} />
        <KpiCard label="Past due"              value={stats.pastDue}     icon={AlertTriangle} iconBg={stats.pastDue > 0 ? 'bg-amber-50' : 'bg-gray-50'} iconColor={stats.pastDue > 0 ? 'text-amber-600' : 'text-gray-400'} accent={stats.pastDue > 0} />
        <KpiCard label="Cancelled"             value={stats.cancelled}   icon={XCircle}       iconBg="bg-rose-50"    iconColor="text-rose-500" />
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Paused"          value={stats.paused}       icon={PauseCircle}   iconBg="bg-gray-50"    iconColor="text-gray-400" />
        <KpiCard label="No active plan"  value={stats.unsubscribed} icon={Building2}     iconBg="bg-gray-50"    iconColor="text-gray-400" />
        <KpiCard label="Total properties" value={stats.totalHotels} icon={Users}         iconBg="bg-blue-50"    iconColor="text-blue-500" />
        <KpiCard label="Upcoming renewals (30d)" value={upcomingRenewals.length} icon={Calendar} iconBg="bg-purple-50" iconColor="text-purple-500" />
      </div>

      {/* ── Revenue by plan + Action center ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Revenue by plan */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-500" /> Revenue by Plan
          </h2>
          <p className="text-xs text-gray-400 mb-5">MRR contribution per active plan</p>

          {revenueByPlan.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No active paying subscriptions yet</p>
          ) : (
            <div className="space-y-5">
              {revenueByPlan.map(plan => (
                <div key={plan.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {plan.activeCount} active
                        {plan.trialingCount > 0 && ` · ${plan.trialingCount} trial`}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 shrink-0 ml-3">
                      {usd(plan.mrr)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                      style={{ width: `${Math.max(3, (plan.mrr / maxPlanMrr) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billing Action Center */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Billing Action Center
          </h2>
          <p className="text-xs text-gray-400 mb-5">Items that need your attention</p>

          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700">All clear</p>
              <p className="text-xs text-gray-400 mt-1">No billing issues require attention right now</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {actions.map((item, i) => {
                const styles = {
                  high:   { bar: 'border-l-rose-500',   bg: 'bg-rose-50',   icon: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" /> },
                  medium: { bar: 'border-l-amber-500',  bg: 'bg-amber-50',  icon: <Clock className="h-4 w-4 text-amber-500 shrink-0" />        },
                  low:    { bar: 'border-l-indigo-400', bg: 'bg-indigo-50', icon: <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />    },
                }[item.urgency]
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${styles.bar} ${styles.bg}`}>
                    {styles.icon}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.hotel.name}</p>
                      <p className="text-xs text-gray-500">{item.label}</p>
                    </div>
                    <Link
                      href={`/super-admin/hotels/${item.hotel.id}`}
                      className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Payment Totals ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" /> Booking Payments
        </h2>
        <p className="text-xs text-gray-400 mb-5">Totals across all hotel booking payments recorded on the platform</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Collected',  value: bookingStats.paid,     cls: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending',    value: bookingStats.pending,  cls: 'text-amber-600',   bg: 'bg-amber-50'   },
            { label: 'Failed',     value: bookingStats.failed,   cls: 'text-rose-600',    bg: 'bg-rose-50'    },
            { label: 'Refunded',   value: bookingStats.refunded, cls: 'text-gray-500',    bg: 'bg-gray-50'    },
          ].map(({ label, value, cls, bg }) => (
            <div key={label} className={`rounded-xl ${bg} px-4 py-4`}>
              <p className={`text-2xl font-black ${cls}`}>{usd(value)}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subscriptions table ── */}
      <SubscriptionsTable hotels={hotels} />
    </div>
  )
}
