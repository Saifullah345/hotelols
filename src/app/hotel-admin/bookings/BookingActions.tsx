'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'

const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
}

// When a booking is checked in/out the linked room's status follows along.
const roomStatusForBooking: Record<string, string> = {
  checked_in: 'booked',
  checked_out: 'cleaning',
}

export default function BookingActions({ bookingId, currentStatus }: { bookingId: string; currentStatus: string }) {
  const router = useRouter()

  const updateStatus = async (status: string, close: () => void) => {
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
      router.refresh()
      return
    }

    const supabase = createClient()

    // Keep the room status in sync. Previously this was fire-and-forget and the
    // room update never actually executed (the query builder was never awaited),
    // so check-in/out sometimes appeared to "do nothing".
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
    router.refresh()
  }

  const next = transitions[currentStatus] ?? []

  // No further transitions for checked-out / cancelled bookings.
  if (next.length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <ActionMenu
      button={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
      buttonClassName="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      buttonAriaLabel="Booking actions"
    >
      {close =>
        next.map(status => (
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
        ))
      }
    </ActionMenu>
  )
}
