// Shared "when did this happen" filter used by the bookings and payments lists,
// so both offer the same windows and resolve them the same way.

export type DateRangeKey = 'all' | 'today' | '3d' | '7d' | '10d' | 'custom'

/**
 * Preset windows counted back from today. `daysBack: 0` is today only; `2`
 * covers today plus the two days before it, up to the last 10 days. `null`
 * lifts the filter entirely.
 */
export const DATE_RANGES: { key: DateRangeKey; label: string; daysBack: number | null }[] = [
  { key: 'all',   label: 'All time',     daysBack: null },
  { key: 'today', label: 'Today',        daysBack: 0    },
  { key: '3d',    label: 'Last 3 days',  daysBack: 2    },
  { key: '7d',    label: 'Last 7 days',  daysBack: 6    },
  { key: '10d',   label: 'Last 10 days', daysBack: 9    },
]

/** Half-open [from, to) window in epoch ms, or null when nothing is filtered. */
export interface DateWindow { from: number; to: number }

/**
 * Resolves the selected range into a window.
 *
 * `today` is a yyyy-mm-dd anchor supplied by the caller (server value first,
 * then the viewer's own date) so server and client renders agree.
 */
export function resolveDateWindow(
  key: string,
  today: string,
  customFrom?: string,
  customTo?: string,
): DateWindow | null {
  if (key === 'custom') {
    if (!customFrom && !customTo) return null
    const from = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : 0
    // Inclusive of the whole "to" day.
    const toDate = customTo ? new Date(`${customTo}T00:00:00`) : null
    if (toDate) toDate.setDate(toDate.getDate() + 1)
    return { from, to: toDate ? toDate.getTime() : Infinity }
  }

  const range = DATE_RANGES.find(r => r.key === key)
  if (!range || range.daysBack === null) return null
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() - range.daysBack)
  return { from: d.getTime(), to: Infinity }
}

/** True when `iso` (any parseable date) falls inside the window. */
export function inWindow(iso: string, w: DateWindow | null): boolean {
  if (!w) return true
  const t = new Date(iso).getTime()
  return t >= w.from && t < w.to
}
