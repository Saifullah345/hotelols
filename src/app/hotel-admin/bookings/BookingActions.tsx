'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Wallet, AlertTriangle, Loader2, X } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import Link from 'next/link'

const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
}

const roomStatusForBooking: Record<string, string> = {
  checked_in: 'booked',
  checked_out: 'cleaning',
}

function CancelConfirmModal({ onConfirm, onClose }: { onConfirm: () => Promise<void>; onClose: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onClose} disabled={loading} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Cancel Booking?</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          This will mark the booking as cancelled. The action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BookingActions({
  bookingId,
  currentStatus,
  onStatusChange,
}: {
  bookingId: string
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
}) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [closeMenu, setCloseMenu] = useState<(() => void) | null>(null)

  const updateStatus = async (status: string, close: () => void) => {
    // Cancellation requires confirmation — open modal instead of acting immediately
    if (status === 'cancelled') {
      setCloseMenu(() => close)
      setShowCancelModal(true)
      return
    }

    // Confirming goes through the server so we can email the guest a branded
    // confirmation with a PDF invoice attached.
    if (status === 'confirmed') {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Failed to confirm booking'); return }
      toast.success(json.emailed ? 'Booking confirmed — invoice emailed to guest' : 'Booking confirmed')
      close()
      onStatusChange?.('confirmed')
      router.refresh()
      return
    }

    const supabase = createClient()

    const roomStatus = roomStatusForBooking[status]
    if (roomStatus) {
      const { data } = await supabase.from('bookings').select('room_id').eq('id', bookingId).single()
      if (data?.room_id) {
        await supabase.from('rooms').update({ status: roomStatus }).eq('id', data.room_id)
      }
    }

    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
    if (error) { toast.error(error.message); return }
    toast.success(`Booking ${status.replace('_', ' ')}`)
    close()
    onStatusChange?.(status)
    router.refresh()
  }

  const confirmCancel = async () => {
    const supabase = createClient()
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    if (error) { toast.error(error.message); return }
    toast.success('Booking cancelled')
    setShowCancelModal(false)
    closeMenu?.()
    onStatusChange?.('cancelled')
    router.refresh()
  }

  const next = transitions[currentStatus] ?? []

  if (next.length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const showRecordPayment = ['pending', 'confirmed', 'checked_in'].includes(currentStatus)

  return (
    <>
      <ActionMenu
        button={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
        buttonClassName="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        buttonAriaLabel="Booking actions"
      >
        {close => (
          <>
            {next.map(status => (
              <button
                key={status}
                role="menuitem"
                onClick={() => updateStatus(status, close)}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 capitalize ${
                  status === 'cancelled' ? 'text-red-700' : 'text-gray-700'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
            {showRecordPayment && (
              <>
                {next.length > 0 && <div className="border-t border-gray-100 my-1" />}
                <Link
                  href={`/hotel-admin/payments/collect?booking_id=${bookingId}`}
                  role="menuitem"
                  onClick={close}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-emerald-700 hover:bg-emerald-50"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Record Payment
                </Link>
              </>
            )}
          </>
        )}
      </ActionMenu>

      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={confirmCancel}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </>
  )
}
