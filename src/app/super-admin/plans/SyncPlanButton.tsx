'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'

/**
 * Repairs one plan's Paddle entry: publishes missing prices, replaces a price
 * whose amount has drifted, and strips any free trial (a trial is what makes
 * the first charge come through as 0.00).
 */
export default function SyncPlanButton({
  planId, planName, published,
}: {
  planId: string
  planName: string
  /** False when the plan has no Paddle prices at all — it can't be bought yet. */
  published: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const sync = async () => {
    setBusy(true)
    try {
      const res  = await fetch(`/api/admin/plans/${planId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeTrials: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not sync with Paddle'); return }

      toast.success(`${planName}: ${json.message}`)
      for (const problem of json.problems ?? []) toast.warning(`${planName}: ${problem}`)
      router.refresh()
    } catch {
      toast.error('Could not reach Paddle')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={sync}
      disabled={busy}
      title="Publish this plan to Paddle, fix a drifted price, and remove any free trial"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
        published
          ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
          : 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {busy ? 'Syncing…' : published ? 'Sync to Paddle' : 'Publish to Paddle'}
    </button>
  )
}
