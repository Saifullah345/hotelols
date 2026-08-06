import Link from 'next/link'
import { Lock, EyeOff, Ban, CreditCard } from 'lucide-react'
import type { SubscriptionInfo } from '@/lib/subscription'

/**
 * Shown in place of every hotel-admin screen once the plan has lapsed. Billing
 * stays reachable — the way out has to be one click away.
 */
export default function SubscriptionLocked({
  info, hotelName, planName,
}: {
  info: SubscriptionInfo
  hotelName?: string | null
  planName?: string | null
}) {
  const expired = info.expiresAt
    ? info.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <Lock className="h-7 w-7 text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">
          {planName ? `Your ${planName} plan has expired` : 'Your plan has expired'}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {hotelName ? `${hotelName} is` : 'Your hotel is'} paused
          {expired ? ` — the subscription ended on ${expired}.` : '.'}
          {' '}Renew to pick up exactly where you left off; nothing has been deleted.
        </p>

        <div className="mt-6 space-y-3 text-left">
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
        </div>

        <Link
          href="/hotel-admin/billing"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <CreditCard className="h-4 w-4" /> Renew subscription
        </Link>
      </div>
    </div>
  )
}
