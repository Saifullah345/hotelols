'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Slash } from 'lucide-react'

interface SuspendUserButtonProps {
  userId: string
  suspended: boolean
}

export default function SuspendUserButton({ userId, suspended }: SuspendUserButtonProps) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)

  const handleToggle = async () => {
    setIsBusy(true)
    try {
      const res = await fetch('/api/admin/suspend-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: suspended ? 'unsuspend' : 'suspend' }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json.error ?? 'Unable to update account status')
        return
      }

      toast.success(suspended ? 'Account unsuspended' : 'Account suspended')
      router.refresh()
    } catch (error) {
      toast.error('Unable to update account status')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isBusy}
      className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
      {!isBusy && <Slash className="h-4 w-4" />}
      {suspended ? 'Unsuspend' : 'Suspend'}
    </button>
  )
}
