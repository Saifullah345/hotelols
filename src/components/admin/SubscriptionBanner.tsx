import Link from 'next/link'
import { AlertTriangle, Clock, CreditCard, Rocket } from 'lucide-react'
import { subscriptionMessage, type SubscriptionInfo } from '@/lib/subscription'

/**
 * Warns the hotel before its plan lapses, and says plainly what has stopped
 * working once it has. Silent while the subscription is healthy.
 */
export default function SubscriptionBanner({
  info, planName,
}: {
  info: SubscriptionInfo
  planName?: string | null
}) {
  const message = subscriptionMessage(info, planName)
  if (!message) return null

  // Nothing has gone wrong for a hotel that simply hasn't subscribed yet — it
  // is an invitation, not a warning, so it doesn't get the red treatment.
  const tone = info.state === 'unsubscribed'
    ? {
        wrap: 'border-indigo-200 bg-indigo-50',
        icon: 'text-indigo-500',
        title: 'text-indigo-900',
        body: 'text-indigo-700',
        button: 'bg-indigo-600 hover:bg-indigo-700',
        Icon: Rocket,
        heading: 'Activate your hotel',
      }
    : info.state === 'expired' || info.state === 'past_due'
    ? {
        wrap: 'border-red-200 bg-red-50',
        icon: 'text-red-500',
        title: 'text-red-800',
        body: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700',
        Icon: info.state === 'past_due' ? CreditCard : AlertTriangle,
        heading: info.state === 'past_due' ? 'Payment failed' : 'Subscription expired',
      }
    : {
        wrap: 'border-amber-200 bg-amber-50',
        icon: 'text-amber-500',
        title: 'text-amber-800',
        body: 'text-amber-700',
        button: 'bg-primary-600 hover:bg-primary-700',
        Icon: Clock,
        heading: 'Subscription ending soon',
      }

  const { Icon } = tone

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3 ${tone.wrap}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${tone.title}`}>{tone.heading}</p>
        <p className={`mt-0.5 text-xs ${tone.body}`}>{message}</p>
      </div>
      <Link
        href="/hotel-admin/billing#plans"
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${tone.button}`}
      >
        {info.state === 'past_due' ? 'Update payment'
          : info.state === 'unsubscribed' ? 'Choose a plan'
          : 'Renew now'}
      </Link>
    </div>
  )
}
