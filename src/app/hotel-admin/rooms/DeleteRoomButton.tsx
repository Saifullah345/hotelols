'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast.error(json.error ?? 'Cannot delete room')
      setConfirm(false)
      return
    }
    toast.success('Room deleted')
    router.refresh()
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Yes
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-700 px-1"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </button>
  )
}
