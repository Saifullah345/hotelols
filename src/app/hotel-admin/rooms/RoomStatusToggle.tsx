'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const statuses = ['available', 'booked', 'maintenance', 'cleaning']

export default function RoomStatusToggle({ roomId, currentStatus }: { roomId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const update = async (status: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (error) { toast.error(error.message); return }
    toast.success('Room status updated')
    router.refresh()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-xs text-primary-600 hover:underline">Change</button>
      {open && (
        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-36">
          {statuses.filter(s => s !== currentStatus).map(s => (
            <button key={s} onClick={() => update(s)}
              className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 capitalize">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
