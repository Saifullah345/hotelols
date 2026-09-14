'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Check } from 'lucide-react'

/**
 * A time field with its own picker.
 *
 * `<input type="time">` hands the drop-down to the browser, and the browser's
 * is not ours to lay out: Chrome on Windows renders hours, minutes and AM/PM as
 * three independently scrolled lists with a gap between the first two that no
 * stylesheet can reach — which is the misalignment this replaces. It also means
 * the picker looks like a different product on every OS, next to inputs that
 * look like ours everywhere.
 *
 * So the columns are drawn here: equal widths, one shared gap, one shared row
 * height, and the selected value scrolled into view when the panel opens.
 *
 * The value is the same 'HH:MM' 24-hour string `<input type="time">` produces,
 * so nothing downstream — the hourly booking API, the `TIME` columns,
 * lib/hourly.ts — has to know this changed.
 */

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1) // 1…12

export interface TimeFieldProps {
  value: string
  onChange: (value: string) => void
  /** Minute granularity offered in the list. A minute already in `value` that
   * doesn't land on the step is kept and shown, so an existing 11:07 is never
   * silently rounded away. */
  minuteStep?: number
  id?: string
  name?: string
  disabled?: boolean
  placeholder?: string
  /** Wrapper class — the field's width and any text sizing. */
  className?: string
  /** Class on the trigger itself, for pages that style their inputs with
   * something other than the global `.input` (the settings page does). */
  inputClassName?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

/** Splits 'HH:MM' (or 'HH:MM:SS') into 12-hour parts, or null when unusable. */
function parse(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '')
  if (!match) return null
  const hour24 = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return null
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
  }
}

/** 12-hour parts back to the 'HH:MM' the form and the API speak. */
function serialise(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  const hour24 = period === 'PM' ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatTimeLabel(value: string): string {
  const parts = parse(value)
  if (!parts) return ''
  return `${String(parts.hour12).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} ${parts.period}`
}

export default function TimeField({
  value,
  onChange,
  minuteStep = 5,
  id,
  name,
  disabled,
  placeholder = 'Select time',
  className = '',
  inputClassName = 'input',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const parts = parse(value)

  const minutes = useMemo(() => {
    const step = Math.min(Math.max(1, Math.round(minuteStep)), 30)
    const list: number[] = []
    for (let m = 0; m < 60; m += step) list.push(m)
    // Keep a stored value that isn't on the step (a legacy row, or a time set
    // before the step changed) selectable instead of dropping it from the list.
    if (parts && !list.includes(parts.minute)) list.push(parts.minute)
    return list.sort((a, b) => a - b)
  }, [minuteStep, parts])

  // Close on an outside click or Escape — the panel is a popover, not a modal,
  // so it must not trap anything.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const commit = (next: Partial<{ hour12: number; minute: number; period: 'AM' | 'PM' }>) => {
    // Opening on an empty field and picking an hour should give a usable time,
    // so the untouched parts default rather than blocking the selection.
    const base = parts ?? { hour12: 12, minute: 0, period: 'PM' as const }
    onChange(serialise(next.hour12 ?? base.hour12, next.minute ?? base.minute, next.period ?? base.period))
  }

  const label = formatTimeLabel(value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        onClick={() => setOpen(o => !o)}
        className={`${inputClassName} flex items-center gap-2 text-left disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className={label ? 'text-gray-900' : 'text-gray-400'}>{label || placeholder}</span>
      </button>

      {/* Kept in the DOM so the value still posts with a plain form submit and
          so anything reading the field by name (tests, autofill) still finds it. */}
      {name && <input type="hidden" name={name} value={value ?? ''} readOnly />}

      {open && (
        <div
          role="dialog"
          aria-label="Choose a time"
          className="absolute z-50 mt-1 w-full min-w-[15rem] rounded-xl border border-gray-200 bg-white shadow-lg p-2"
        >
          {/* One grid, so the three columns share a single gap and a single
              column width — the alignment the native picker doesn't give us. */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-1">
            <Column
              heading="Hour"
              items={HOURS_12.map(h => ({ key: h, label: String(h).padStart(2, '0') }))}
              selected={parts?.hour12 ?? null}
              onSelect={h => commit({ hour12: h })}
            />
            <Column
              heading="Min"
              items={minutes.map(m => ({ key: m, label: String(m).padStart(2, '0') }))}
              selected={parts?.minute ?? null}
              onSelect={m => commit({ minute: m })}
            />
            <Column
              heading="AM/PM"
              items={[
                { key: 'AM' as const, label: 'AM' },
                { key: 'PM' as const, label: 'PM' },
              ]}
              selected={parts?.period ?? null}
              onSelect={p => commit({ period: p })}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 px-1"
            >
              <Check className="h-3 w-3" /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Column<T extends string | number>({
  heading,
  items,
  selected,
  onSelect,
}: {
  heading: string
  items: { key: T; label: string }[]
  selected: T | null
  onSelect: (key: T) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Open on the current value rather than at the top of the list — otherwise a
  // stored 11:00 PM opens showing 01:00 AM and has to be hunted for.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'center' })
    // Once, on mount: re-running on every selection would fight the user's own
    // scrolling while the panel is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center pb-1">
        {heading}
      </p>
      <div ref={listRef} className="max-h-44 overflow-y-auto scrollbar-hide space-y-0.5 pr-0.5">
        {items.map(item => {
          const isSelected = selected === item.key
          return (
            <button
              key={String(item.key)}
              type="button"
              data-selected={isSelected}
              aria-pressed={isSelected}
              onClick={() => onSelect(item.key)}
              className={`w-full h-8 rounded-lg text-sm font-medium tabular-nums transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
