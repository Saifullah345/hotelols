'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'

/**
 * Recovers a hotel that has paid but is still being shown the lock.
 *
 * Webhooks never reach a machine that isn't publicly addressable, and even in
 * production one can be missed. When the hotel has a Paddle subscription on
 * file but the dashboard thinks it has nothing, the likeliest explanation is a
 * webhook that never landed — so ask Paddle once, directly, and refresh.
 *
 * Once per mount, so a genuinely lapsed subscription doesn't turn into a
 * polling loop.
 */
export default function SubscriptionSelfHeal() {
  const router = useRouter()
  const asked = useRef(false)
  const [state, setState] = useState<'checking' | 'idle' | 'failed'>('checking')

  useEffect(() => {
    if (asked.current) return
    asked.current = true

    fetch('/api/paddle/confirm', { method: 'POST' })
      .then(async res => {
        if (res.ok) {
          router.refresh()
          setState('idle')
        } else {
          setState('failed')
        }
      })
      .catch(() => setState('failed'))
  }, [router])

  if (state !== 'checking') return null

  return (
    <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Checking your latest payment with Paddle…
      <RefreshCw className="h-3.5 w-3.5 opacity-0" aria-hidden />
    </div>
  )
}
