'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
}

export default function BookingActions({ bookingId, currentStatus }: { bookingId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const updateStatus = async (status: string) => {
    const supabase = createClient()
    const updates: Record<string, unknown> = { status }
    if (status === 'checked_in') {
      await supabase.from('bookings').select('room_id').eq('id', bookingId).single()
        .then(({ data }) => {
          if (data) supabase.from('rooms').update({ status: 'booked' }).eq('id', data.room_id)
        })
    }
    if (status === 'checked_out') {
      await supabase.from('bookings').select('room_id').eq('id', bookingId).single()
        .then(({ data }) => {
          if (data) supabase.from('rooms').update({ status: 'cleaning' }).eq('id', data.room_id)
        })
    }
    const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId)
    if (error) { toast.error(error.message); return }
    toast.success(`Booking ${status.replace('_', ' ')}`)
    router.refresh()
    setOpen(false)
  }

  const next = transitions[currentStatus] ?? []

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>
      {open && next.length > 0 && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-36">
          {next.map(status => (
            <button key={status} onClick={() => updateStatus(status)}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 capitalize ${
                status === 'cancelled' ? 'text-red-700' : 'text-gray-700'
              }`}>
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
