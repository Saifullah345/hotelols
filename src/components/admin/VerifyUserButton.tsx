'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface VerifyUserButtonProps {
  userId: string
  isVerified?: boolean
}

export default function VerifyUserButton({ userId, isVerified = false }: VerifyUserButtonProps) {
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)

  if (isVerified) {
    return (
      <button
        type="button"
        disabled
        className="btn-secondary inline-flex items-center gap-2 text-sm opacity-50 cursor-not-allowed"
      >
        <CheckCircle2 className="h-4 w-4" />
        Verified
      </button>
    )
  }

  const handleVerify = async () => {
    setIsBusy(true)
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json.error ?? 'Unable to verify user')
        return
      }

      toast.success(json.alreadyVerified ? 'User already verified' : 'User verified successfully')
      router.refresh()
    } catch (error) {
      toast.error('Unable to verify user')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={isBusy}
      className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Verify
    </button>
  )
}
