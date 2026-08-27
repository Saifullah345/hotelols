'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, Eye, Pencil, CheckCircle2,
  PauseCircle, Trash2, Loader2, AlertTriangle, X,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'

function DeleteModal({
  hotelId,
  hotelName,
  onClose,
}: {
  hotelId: string
  hotelName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm.trim().toLowerCase() !== hotelName.trim().toLowerCase()) {
      toast.error(`Type the hotel name exactly: "${hotelName}"`)
      return
    }
    setDeleting(true)
    const res = await fetch(`/api/super-admin/hotels/${hotelId}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete hotel'); return }
    toast.success('Hotel deleted')
    onClose()
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Delete Hotel</h3>
              <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} disabled={deleting} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Deleting <strong className="text-gray-900">{hotelName}</strong> will permanently remove all rooms, bookings, payments, and staff records associated with this hotel.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Type hotel name to confirm
            </label>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDelete()}
              placeholder={hotelName}
              className="input text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirm.trim().toLowerCase() !== hotelName.trim().toLowerCase()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting…' : 'Delete Hotel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HotelActions({
  hotelId,
  hotelName,
  currentStatus,
}: {
  hotelId: string
  hotelName: string
  currentStatus: string
}) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)

  const updateStatus = async (status: string, close: () => void) => {
    const res = await fetch(`/api/super-admin/hotels/${hotelId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(json.error ?? 'Failed to update status'); return }
    toast.success(`Hotel ${status}`)
    close()
    router.refresh()
  }

  return (
    <>
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
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-gray-400" /> View Details
            </button>

            <button
              role="menuitem"
              onClick={() => { close(); router.push(`/super-admin/hotels/${hotelId}/edit`) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-400" /> Edit Hotel
            </button>

            <div className="border-t border-gray-100 my-1" />

            {currentStatus !== 'active' && (
              <button
                role="menuitem"
                onClick={() => updateStatus('active', close)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Activate
              </button>
            )}
            {currentStatus !== 'suspended' && (
              <button
                role="menuitem"
                onClick={() => updateStatus('suspended', close)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <PauseCircle className="h-3.5 w-3.5" /> Suspend
              </button>
            )}

            <div className="border-t border-gray-100 my-1" />

            <button
              role="menuitem"
              onClick={() => { close(); setShowDelete(true) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Hotel
            </button>
          </>
        )}
      </ActionMenu>

      {showDelete && (
        <DeleteModal
          hotelId={hotelId}
          hotelName={hotelName}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
