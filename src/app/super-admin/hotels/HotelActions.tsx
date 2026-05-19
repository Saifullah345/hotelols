'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

export default function HotelActions({ hotelId, currentStatus }: { hotelId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const updateStatus = async (status: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({ status }).eq('id', hotelId)
    if (error) { toast.error(error.message); return }
    toast.success(`Hotel ${status}`)
    router.refresh()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-36 py-1">
          {currentStatus !== 'active' && (
            <button onClick={() => updateStatus('active')}
              className="w-full px-4 py-2 text-sm text-left text-green-700 hover:bg-green-50">Activate</button>
          )}
          {currentStatus !== 'suspended' && (
            <button onClick={() => updateStatus('suspended')}
              className="w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-50">Suspend</button>
          )}
          <button onClick={() => { setOpen(false) }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50">View Details</button>
        </div>
      )}
    </div>
  )
}
