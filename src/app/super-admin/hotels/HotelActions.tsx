'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'

export default function HotelActions({ hotelId, currentStatus }: { hotelId: string; currentStatus: string }) {
  const router = useRouter()

  const updateStatus = async (status: string, close: () => void) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({ status }).eq('id', hotelId)
    if (error) { toast.error(error.message); return }
    toast.success(`Hotel ${status}`)
    close()
    router.refresh()
  }

  return (
    <ActionMenu
      button={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
      buttonClassName="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      buttonAriaLabel="Hotel actions"
    >
      {close => (
        <>
          <button
            role="menuitem"
            onClick={() => { close(); router.push(`/super-admin/hotels/${hotelId}`) }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
          >
            View Details
          </button>
          {currentStatus !== 'active' && (
            <button
              role="menuitem"
              onClick={() => updateStatus('active', close)}
              className="w-full px-4 py-2 text-sm text-left text-green-700 hover:bg-green-50"
            >
              Activate
            </button>
          )}
          {currentStatus !== 'suspended' && (
            <button
              role="menuitem"
              onClick={() => updateStatus('suspended', close)}
              className="w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-50"
            >
              Suspend
            </button>
          )}
        </>
      )}
    </ActionMenu>
  )
}
