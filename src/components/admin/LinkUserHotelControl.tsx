'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Check, Loader2 } from 'lucide-react'

interface LinkUserHotelControlProps {
  userId: string
  hotelId: string | null
  hotels: { id: string; name: string }[]
}

export default function LinkUserHotelControl({ userId, hotelId, hotels }: LinkUserHotelControlProps) {
  const router = useRouter()
  const [selectedHotelId, setSelectedHotelId] = useState(hotelId ?? '')
  const [isBusy, setIsBusy] = useState(false)

  const handleSave = async () => {
    setIsBusy(true)
    try {
      const res = await fetch('/api/admin/link-user-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hotelId: selectedHotelId || null }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json.error ?? 'Unable to link user to hotel')
        return
      }

      toast.success(selectedHotelId ? 'User linked to hotel' : 'Hotel link removed')
      router.refresh()
    } catch {
      toast.error('Unable to link user to hotel')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedHotelId}
        onChange={event => setSelectedHotelId(event.target.value)}
        disabled={isBusy}
        aria-label="Link user to hotel"
        className="input min-w-[150px] py-2 text-sm"
      >
        <option value="">No hotel</option>
        {hotels.map(hotel => (
          <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={isBusy || selectedHotelId === (hotelId ?? '')}
        className="btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save hotel link"
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedHotelId ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
        {isBusy ? 'Saving' : 'Save'}
      </button>
    </div>
  )
}