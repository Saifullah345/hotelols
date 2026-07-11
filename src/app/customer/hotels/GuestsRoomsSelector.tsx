'use client'

import { useState } from 'react'
import { Users, Minus, Plus } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'

interface Props {
  defaultAdults?: number
  defaultChildren?: number
  defaultRooms?: number
}

export default function GuestsRoomsSelector({ defaultAdults = 2, defaultChildren = 0, defaultRooms = 1 }: Props) {
  const [adults, setAdults] = useState(defaultAdults)
  const [children, setChildren] = useState(defaultChildren)
  const [rooms, setRooms] = useState(defaultRooms)

  const summary = `${adults} adult${adults === 1 ? '' : 's'}${
    children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''
  } · ${rooms} room${rooms === 1 ? '' : 's'}`

  return (
    <div className="relative flex-1 sm:max-w-[16rem] sm:border-l sm:border-gray-100">
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      <input type="hidden" name="rooms" value={rooms} />
      <ActionMenu
        align="left"
        buttonAriaLabel="Guests and rooms"
        buttonClassName="flex w-full items-center gap-2 rounded-xl py-2.5 px-3 text-left text-sm text-gray-900 hover:bg-gray-50"
        menuClassName="z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        button={
          <>
            <Users className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{summary}</span>
          </>
        }
      >
        {close => (
          <>
            <div className="space-y-4">
              <Stepper label="Adults" value={adults} min={1} max={10} onChange={setAdults} />
              <Stepper label="Children" value={children} min={0} max={10} onChange={setChildren} />
              <Stepper label="Rooms" value={rooms} min={1} max={6} onChange={setRooms} />
            </div>
            <button
              type="button"
              onClick={close}
              className="btn-primary mt-4 w-full justify-center py-2 text-sm"
            >
              Done
            </button>
          </>
        )}
      </ActionMenu>
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-4 text-center text-sm font-semibold text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
