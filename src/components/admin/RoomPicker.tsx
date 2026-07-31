'use client'

import { BedDouble, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

export type PickableRoom = {
  id: string
  room_number: string
  name: string | null
  price_per_night: number
  capacity?: number
  room_type?: { name?: string } | null
}

/**
 * Edits the set of rooms on a booking: drop one, add another, or do both to
 * move a guest across the hall. A booking must keep at least one room —
 * emptying it is a cancellation, not an edit.
 */
export default function RoomPicker({
  rooms, selected, taken, currency, onChange, changed,
}: {
  /** Every room in the hotel. */
  rooms: PickableRoom[]
  /** Room ids currently on the booking, in order. */
  selected: string[]
  /** Room ids held by other bookings over the chosen nights. */
  taken: Set<string>
  currency: string
  onChange: (next: string[]) => void
  /** Whether the set differs from what was saved, to warn about repricing. */
  changed: boolean
}) {
  const byId   = new Map(rooms.map(r => [r.id, r]))
  const chosen = selected.map(id => byId.get(id)).filter(Boolean) as PickableRoom[]
  const available = rooms.filter(r => !selected.includes(r.id) && !taken.has(r.id))

  const add    = (id: string) => { if (!selected.includes(id)) onChange([...selected, id]) }
  const remove = (id: string) => { if (selected.length > 1) onChange(selected.filter(r => r !== id)) }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Rooms ({selected.length})
      </p>

      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
        {chosen.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
              <BedDouble className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="truncate">
                {r.name ?? `Room ${r.room_number}`}
                {r.room_type?.name && <span className="text-gray-400"> · {r.room_type.name}</span>}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">
                {formatCurrency(Number(r.price_per_night), currency)}/night
              </span>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={selected.length <= 1}
                title={selected.length <= 1 ? 'A booking must keep at least one room' : 'Remove this room'}
                aria-label={`Remove ${r.name ?? `Room ${r.room_number}`}`}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ))}
        {selected.length > chosen.length && (
          <p className="px-3 py-2 text-xs text-amber-600">
            {selected.length - chosen.length} room(s) on this booking are no longer in the room list.
          </p>
        )}
      </div>

      <select
        value=""
        onChange={e => { if (e.target.value) add(e.target.value) }}
        className="input text-sm"
      >
        <option value="">+ Add a room…</option>
        {available.map(r => (
          <option key={r.id} value={r.id}>
            {r.name ?? `Room ${r.room_number}`}
            {r.room_type?.name ? ` · ${r.room_type.name}` : ''}
            {` — ${formatCurrency(Number(r.price_per_night), currency)}/night`}
          </option>
        ))}
      </select>

      <p className="text-[11px] text-gray-400">
        {available.length
          ? 'Only rooms free for these dates are listed. Remove one and add another to move the guest.'
          : 'No other rooms are free for these dates.'}
      </p>
      {changed && (
        <p className="text-[11px] font-medium text-blue-600">
          Rooms changed — the total is recalculated on save.
        </p>
      )}
    </div>
  )
}
