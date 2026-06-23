'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ActionMenu } from '@/components/ui/ActionMenu'

const statuses = ['available', 'booked', 'maintenance', 'cleaning']

export default function RoomStatusToggle({ roomId, currentStatus }: { roomId: string; currentStatus: string }) {
  const router = useRouter()

  const update = async (status: string, close: () => void) => {
    const supabase = createClient()
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (error) { toast.error(error.message); return }
    toast.success('Room status updated')
    close()
    router.refresh()
  }

  return (
    <ActionMenu
      button="Change"
      buttonClassName="text-xs text-primary-600 hover:underline"
      buttonAriaLabel="Change room status"
    >
      {close =>
        statuses.filter(s => s !== currentStatus).map(s => (
          <button
            key={s}
            role="menuitem"
            onClick={() => update(s, close)}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 capitalize"
          >
            {s}
          </button>
        ))
      }
    </ActionMenu>
  )
}
