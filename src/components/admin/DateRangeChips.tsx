'use client'

import { Calendar, X } from 'lucide-react'
import { DATE_RANGES } from '@/lib/dateRange'

interface Props {
  /** Selected range key. */
  value: string
  onChange: (key: string) => void
  customFrom: string
  customTo: string
  onCustomFrom: (v: string) => void
  onCustomTo: (v: string) => void
  /** yyyy-mm-dd anchor for "today". */
  today: string
  /** Word describing what the dates refer to, e.g. "Booked" or "Paid". */
  label: string
  /** Optional per-range counts, keyed by range key. */
  counts?: Record<string, number>
}

/**
 * Today-through-last-10-days quick filters plus a custom from→to range.
 * Shared by the bookings and payments lists so both behave identically.
 */
export default function DateRangeChips({
  value, onChange, customFrom, customTo, onCustomFrom, onCustomTo, today, label, counts,
}: Props) {
  const chip = (active: boolean) =>
    `flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <Calendar className="h-3.5 w-3.5" /> {label}
      </span>

      {DATE_RANGES.map(r => (
        <button key={r.key} onClick={() => onChange(r.key)} className={chip(value === r.key)}>
          {r.label}
          {counts && (
            <span className={value === r.key ? 'ml-1.5 text-primary-200' : 'ml-1.5 text-gray-400'}>
              {counts[r.key] ?? 0}
            </span>
          )}
        </button>
      ))}

      {/* Any other window the presets don't cover */}
      <button onClick={() => onChange('custom')} className={chip(value === 'custom')}>
        Custom
      </button>

      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || today}
            onChange={e => onCustomFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {(customFrom || customTo) && (
            <button
              onClick={() => { onCustomFrom(''); onCustomTo('') }}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Clear dates"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}