// Report windows and the figures derived from them.
//
// The screen and the exported file must agree, so the maths lives here and both
// the client page and the export route call it with the same rows.

export type ReportRangeKey = '7d' | '30d' | 'this_month' | 'last_month' | 'year' | 'all' | 'custom'

export const REPORT_RANGES: { key: ReportRangeKey; label: string }[] = [
  { key: '7d',         label: 'Last 7 days'  },
  { key: '30d',        label: 'Last 30 days' },
  { key: 'this_month', label: 'This month'   },
  { key: 'last_month', label: 'Last month'   },
  { key: 'year',       label: 'This year'    },
  { key: 'all',        label: 'All time'     },
]

/** Half-open [from, to) in epoch ms. `null` means everything. */
export interface Window { from: number; to: number }

const startOfDay = (iso: string) => new Date(`${iso}T00:00:00`)

/**
 * Resolves a range into a window.
 *
 * `today` is a yyyy-mm-dd anchor from the caller so a server render and the
 * browser agree on where "today" starts.
 */
export function resolveWindow(
  key: ReportRangeKey | string,
  today: string,
  customFrom?: string,
  customTo?: string,
): Window | null {
  if (key === 'all') return null

  if (key === 'custom') {
    if (!customFrom && !customTo) return null
    const from = customFrom ? startOfDay(customFrom).getTime() : 0
    if (!customTo) return { from, to: Infinity }
    const to = startOfDay(customTo)
    to.setDate(to.getDate() + 1)          // inclusive of the whole end day
    return { from, to: to.getTime() }
  }

  const anchor = startOfDay(today)

  if (key === 'this_month') {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    return { from: from.getTime(), to: Infinity }
  }
  if (key === 'last_month') {
    const from = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
    const to   = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    return { from: from.getTime(), to: to.getTime() }
  }
  if (key === 'year') {
    return { from: new Date(anchor.getFullYear(), 0, 1).getTime(), to: Infinity }
  }

  const days = key === '7d' ? 6 : 29
  const from = new Date(anchor)
  from.setDate(from.getDate() - days)
  return { from: from.getTime(), to: Infinity }
}

export function inWindow(iso: string | null | undefined, w: Window | null): boolean {
  if (!w) return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= w.from && t < w.to
}

/** Human label for the window, used in headings and on the exported file. */
export function windowLabel(key: string, customFrom?: string, customTo?: string): string {
  if (key === 'custom') {
    if (customFrom && customTo) return `${customFrom} to ${customTo}`
    if (customFrom) return `From ${customFrom}`
    if (customTo)   return `Up to ${customTo}`
    return 'Custom range'
  }
  return REPORT_RANGES.find(r => r.key === key)?.label ?? 'All time'
}

// ── Rows the report is built from ───────────────────────────────────
export type PaymentRow = { amount: number; created_at: string; status: string; payment_method?: string | null }
export type BookingRow = { created_at: string; check_in: string; check_out: string; status: string; total_amount: number; source?: string | null }
export type RoomRow    = { status: string }
export type ReviewRow  = { rating: number; created_at?: string | null }

export interface ReportSummary {
  revenue: number
  paymentsCount: number
  bookings: number
  cancelled: number
  nightsSold: number
  avgBookingValue: number
  avgRating: string
  reviewCount: number
  occupancyRate: number
  roomsByStatus: Record<string, number>
  roomTotal: number
  revenueByMethod: { method: string; amount: number }[]
  bookingsBySource: { source: string; count: number }[]
}

const nights = (ci: string, co: string) =>
  Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

export function summarise(
  payments: PaymentRow[],
  bookings: BookingRow[],
  rooms: RoomRow[],
  reviews: ReviewRow[],
  w: Window | null,
): ReportSummary {
  const paid = payments.filter(p => p.status === 'completed' && inWindow(p.created_at, w))
  // Bookings are counted by when they were made, matching "N bookings in the
  // last 7 days" rather than by when the guest arrives.
  const made = bookings.filter(b => inWindow(b.created_at, w))
  const live = made.filter(b => b.status !== 'cancelled')
  const rated = reviews.filter(r => (r.created_at ? inWindow(r.created_at, w) : !w))

  const revenue = paid.reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const byMethod = new Map<string, number>()
  for (const p of paid) {
    const key = p.payment_method ?? 'other'
    byMethod.set(key, (byMethod.get(key) ?? 0) + Number(p.amount ?? 0))
  }

  const bySource = new Map<string, number>()
  for (const b of made) {
    const key = b.source ?? 'online'
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
  }

  const roomsByStatus: Record<string, number> = {}
  for (const r of rooms) roomsByStatus[r.status] = (roomsByStatus[r.status] ?? 0) + 1
  const available = roomsByStatus.available ?? 0

  return {
    revenue,
    paymentsCount: paid.length,
    bookings: made.length,
    cancelled: made.length - live.length,
    nightsSold: live.reduce((s, b) => s + nights(b.check_in, b.check_out), 0),
    avgBookingValue: live.length ? live.reduce((s, b) => s + Number(b.total_amount ?? 0), 0) / live.length : 0,
    avgRating: rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : '0.0',
    reviewCount: rated.length,
    // Occupancy is a snapshot of the rooms right now, not a windowed figure.
    occupancyRate: rooms.length ? Math.round(((rooms.length - available) / rooms.length) * 100) : 0,
    roomsByStatus,
    roomTotal: rooms.length,
    revenueByMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
    bookingsBySource: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
  }
}

/** Revenue per day (short windows) or per month (long ones), for the chart. */
export function revenueSeries(payments: PaymentRow[], w: Window | null, today: string) {
  const paid = payments.filter(p => p.status === 'completed' && inWindow(p.created_at, w))

  const spanDays = w && Number.isFinite(w.to)
    ? Math.round((w.to - w.from) / 86_400_000)
    : w ? Math.round((startOfDay(today).getTime() + 86_400_000 - w.from) / 86_400_000) : 366

  if (spanDays <= 62) {
    const buckets = new Map<string, number>()
    for (let i = 0; i < spanDays; i++) {
      const d = new Date((w?.from ?? 0) + i * 86_400_000)
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
    for (const p of paid) {
      const key = new Date(p.created_at).toISOString().slice(0, 10)
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount ?? 0))
    }
    return [...buckets.entries()].map(([day, revenue]) => ({
      month: new Date(`${day}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      revenue,
      bookings: 0,
    }))
  }

  // Twelve months back from the anchor.
  const anchor = startOfDay(today)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - i), 1)
    return {
      month: d.toLocaleDateString('en', { month: 'short' }),
      revenue: paid
        .filter(p => {
          const t = new Date(p.created_at)
          return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear()
        })
        .reduce((s, p) => s + Number(p.amount ?? 0), 0),
      bookings: 0,
    }
  })
}
