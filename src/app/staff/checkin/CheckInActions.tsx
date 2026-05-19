'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  bookingId: string
  action: 'check_in' | 'check_out'
}

export default function CheckInActions({ bookingId, action }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handle = async () => {
    setLoading(true)
    const supabase = createClient()
    const newStatus = action === 'check_in' ? 'checked_in' : 'checked_out'

    const { data: booking } = await supabase.from('bookings').select('room_id').eq('id', bookingId).single()
    if (booking) {
      await supabase.from('rooms').update({
        status: action === 'check_in' ? 'booked' : 'cleaning',
      }).eq('id', booking.room_id)
    }

    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)
    if (error) { toast.error(error.message); setLoading(false); return }

    toast.success(action === 'check_in' ? 'Guest checked in successfully!' : 'Guest checked out. Room queued for cleaning.')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
        action === 'check_in'
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      } disabled:opacity-60`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {action === 'check_in' ? 'Check In' : 'Check Out'}
    </button>
  )
}
