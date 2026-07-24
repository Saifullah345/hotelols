'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SlidersHorizontal } from 'lucide-react'

const statuses = ['available', 'booked', 'maintenance', 'cleaning']

const dotColor: Record<string, string> = {
  available:   'bg-emerald-400',
  booked:      'bg-blue-400',
  maintenance: 'bg-red-400',
  cleaning:    'bg-amber-400',
}

const textColor: Record<string, string> = {
  available:   'text-emerald-700',
  booked:      'text-blue-700',
  maintenance: 'text-red-700',
  cleaning:    'text-amber-700',
}

export default function RoomStatusToggle({ roomId, currentStatus }: { roomId: string; currentStatus: string }) {
  const router = useRouter()

  const update = async (status: string, close: () => void) => {
    const supabase = createClient()
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (error) { toast.error(error.message); return }
    toast.success('Status updated')
    close()
    router.refresh()
  }

  return (
    <ActionMenu
      button={<SlidersHorizontal className="h-3.5 w-3.5" />}
      buttonClassName="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      buttonAriaLabel="Change room status"
    >
      {close => (
        <div className="py-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Change Status
          </p>
          {statuses.filter(s => s !== currentStatus).map(s => (
            <button
              key={s}
              role="menuitem"
              onClick={() => update(s, close)}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 capitalize flex items-center gap-2.5 font-medium ${textColor[s] ?? 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor[s] ?? 'bg-gray-300'}`} />
              {s}
            </button>
          ))}
        </div>
      )}
    </ActionMenu>
  )
}
