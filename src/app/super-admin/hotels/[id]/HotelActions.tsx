'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

export default function HotelActions({
  hotelId,
  currentStatus,
}: {
  hotelId: string
  currentStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const changeStatus = async (newStatus: 'active' | 'suspended' | 'pending') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/hotels/${hotelId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to update status'); return }
      const labels = { active: 'activated', suspended: 'suspended', pending: 'set to pending' }
      toast.success(`Hotel ${labels[newStatus]}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      {currentStatus !== 'active' && (
        <button
          onClick={() => changeStatus('active')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {currentStatus === 'pending' ? 'Approve' : 'Activate'}
        </button>
      )}
      {currentStatus !== 'suspended' && (
        <button
          onClick={() => changeStatus('suspended')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" /> Suspend
        </button>
      )}
      {currentStatus !== 'pending' && (
        <button
          onClick={() => changeStatus('pending')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" /> Set Pending
        </button>
      )}
    </div>
  )
}
