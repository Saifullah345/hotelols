import Link from 'next/link'
import { Lock, EyeOff, Ban, CreditCard, Rocket, Sparkles, ShieldCheck } from 'lucide-react'
import type { SubscriptionInfo } from '@/lib/subscription'
import SubscriptionSelfHeal from './SubscriptionSelfHeal'

/**
 * Shown in place of every hotel-admin screen while the hotel has no running
 * subscription — either it has never bought one, or the plan has lapsed.
 * Billing stays reachable: the way out has to be one click away.
 */
export default function SubscriptionLocked({
  info, hotelName, planName, trialDays, hasSubscriptionOnFile,
}: {
  info: SubscriptionInfo
  hotelName?: string | null
  planName?: string | null
  /** Longest free trial on offer, for the "start free" line. */
  trialDays?: number
  /** True when Paddle has a subscription for this hotel that we may not have caught up with. */
  hasSubscriptionOnFile?: boolean
}) {
  const neverSubscribed = info.state === 'unsubscribed'

  const expired = info.expiresAt
    ? info.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mx-auto max-w-xl py-10">
      {/* A payment can land without a webhook ever reaching this server. Rather
          than leave a paying hotel staring at a lock, ask Paddle directly. */}
      {hasSubscriptionOnFile && <SubscriptionSelfHeal />}

      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${neverSubscribed ? 'bg-indigo-50' : 'bg-red-50'}`}>
          {neverSubscribed
            ? <Rocket className="h-7 w-7 text-indigo-500" />
            : <Lock className="h-7 w-7 text-red-500" />}
        </div>

        <h2 className="text-xl font-bold text-gray-900">
          {neverSubscribed
            ? 'Choose a plan to open your dashboard'
            : planName ? `Your ${planName} plan has expired` : 'Your plan has expired'}
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {neverSubscribed ? (
            <>
              {hotelName ? `${hotelName} is` : 'Your hotel is'} registered and ready.
              {' '}Pick a plan to start managing rooms, bookings, staff and payments
              {trialDays && trialDays > 0
                ? ` — the first ${trialDays} days are free, and nothing is charged until the trial ends.`
                : '.'}
            </>
          ) : (
            <>
              {hotelName ? `${hotelName} is` : 'Your hotel is'} paused
              {expired ? ` — the subscription ended on ${expired}.` : '.'}
              {' '}Renew to pick up exactly where you left off; nothing has been deleted.
            </>
          )}
        </p>

        <div className="mt-6 space-y-3 text-left">
          {neverSubscribed ? (
            <>
              {trialDays && trialDays > 0 ? (
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <p className="text-sm text-gray-600">
                    Your {trialDays}-day free trial starts the moment you pick a plan. Change
                    plan or cancel at any point during it.
                  </p>
                </div>
              ) : null}
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Rooms, bookings, staff, housekeeping and reports all unlock as soon as the
                  subscription is running.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Your hotel is hidden from guests and can&apos;t take new bookings.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Rooms, bookings and staff are read-only until the plan is active again.
                </p>
              </div>
            </>
          )}
        </div>

        <Link
          href="/hotel-admin/billing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <CreditCard className="h-4 w-4" />
          {neverSubscribed ? 'Choose your plan' : 'Renew subscription'}
        </Link>
      </div>
    </div>
  )
}
