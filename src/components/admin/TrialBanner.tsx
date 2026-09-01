'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, CalendarClock } from 'lucide-react'
import { trialCountdown } from '@/lib/subscription'

/**
 * The trial countdown that sits at the top of every hotel-admin page.
 *
 * "14 days left", then 13, then 12 — the whole point is that the number is
 * never stale, so it is recomputed on the client rather than baked into the
 * server render. A dashboard left open overnight would otherwise still be
 * claiming yesterday's figure.
 */
export default function TrialBanner({
  trialEndsAt, planName, cancelAt,
}: {
  trialEndsAt: string
  planName?: string | null
  /** Set when the hotel has already cancelled: the trial runs out and stops. */
  cancelAt?: string | null
}) {
  const endMs = new Date(trialEndsAt).getTime()
  const [daysLeft, setDaysLeft] = useState(() => remaining(endMs))

  useEffect(() => {
    if (!Number.isFinite(endMs)) return
    // A minute is frequent enough for a day counter and cheap enough to leave
    // running; it also means the banner is correct within a minute of midnight.
    const id = setInterval(() => setDaysLeft(remaining(endMs)), 60_000)
    return () => clearInterval(id)
  }, [endMs])

  if (!Number.isFinite(endMs) || daysLeft === null) return null

  const ended = daysLeft <= 0
  const endsOn = new Date(endMs).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const label = ended ? 'Last day of your trial' : trialCountdown(daysLeft)

  // Runs out of road: the last three days go amber so the countdown reads as a
  // deadline rather than decoration.
  const urgent = daysLeft <= 3
  const tone = urgent
    ? { wrap: 'border-amber-200 bg-amber-50', chip: 'bg-amber-600', title: 'text-amber-900', body: 'text-amber-700', link: 'bg-indigo-600 hover:bg-indigo-700' }
    : { wrap: 'border-indigo-200 bg-indigo-50', chip: 'bg-indigo-600', title: 'text-indigo-900', body: 'text-indigo-700', link: 'bg-indigo-600 hover:bg-indigo-700' }

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${tone.wrap}`}>
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white ${tone.chip}`}>
        {urgent ? <CalendarClock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {label}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${tone.title}`}>
          {planName ? `${planName} free trial` : 'Free trial'}
        </p>
        <p className={`mt-0.5 text-xs ${tone.body}`}>
          {cancelAt
            ? `Your trial ends on ${endsOn} and your subscription stops there — nothing will be charged.`
            : `Your trial ends on ${endsOn}, and your card is charged automatically then. Change or cancel any time before it does.`}
        </p>
      </div>

      <Link
        href="/hotel-admin/billing"
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${tone.link}`}
      >
        {cancelAt ? 'Resubscribe' : 'Manage plan'}
      </Link>
    </div>
  )
}

/** Whole days left, rounded up: 13.2 days to go reads as 14. */
function remaining(endMs: number): number | null {
  if (!Number.isFinite(endMs)) return null
  return Math.ceil((endMs - Date.now()) / 86_400_000)
}
