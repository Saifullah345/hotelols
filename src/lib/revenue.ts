import type { SupabaseClient } from '@supabase/supabase-js'

export type MonthlyRevenue = { month: string; revenue: number; bookings: number }

export type RevenueSummary = {
  /** All-time completed payments. */
  total: number
  /** One entry per month, oldest first, ready for the chart. */
  monthly: MonthlyRevenue[]
}

type SummaryRow = {
  month_start: string
  revenue: number | string
  total_all_time: number | string
}

const monthLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en', { month: 'short', timeZone: 'UTC' })

/**
 * Revenue totals for a hotel's dashboard.
 *
 * The dashboard used to `select('amount, created_at')` with no bound and add
 * the rows up in JavaScript — a full read of the hotel's payment history on
 * every page load, growing without limit. `hotel_revenue_summary` does the same
 * arithmetic in Postgres against an index-only scan and returns one row per
 * month.
 *
 * Falls back to the old client-side roll-up when the function isn't present
 * yet, so the dashboard keeps working on a database that hasn't had migration
 * 033 applied.
 */
/** Set once if the database has no `hotel_revenue_summary` function yet. */
let rpcMissing = false

export async function getRevenueSummary(
  supabase: SupabaseClient,
  hotelId: string,
  monthsBack = 6,
): Promise<RevenueSummary> {
  if (rpcMissing) return fallbackSummary(supabase, hotelId, monthsBack)

  const { data, error } = await supabase.rpc('hotel_revenue_summary', {
    p_hotel_id: hotelId,
    months_back: monthsBack,
  })

  // PGRST202 is "no function matches" — migration 033 hasn't been applied here.
  // Remember that for the life of the process so the dashboard stops paying for
  // a round-trip it already knows will fail.
  if (error && (error.code === 'PGRST202' || /find the function/i.test(error.message ?? ''))) {
    rpcMissing = true
  }

  if (!error && Array.isArray(data)) {
    const rows = data as SummaryRow[]
    return {
      total: Number(rows[0]?.total_all_time ?? 0),
      monthly: rows.map(r => ({
        month: monthLabel(r.month_start),
        revenue: Number(r.revenue ?? 0),
        bookings: 0,
      })),
    }
  }

  return fallbackSummary(supabase, hotelId, monthsBack)
}

/** Pre-migration path: read the rows and bucket them here. */
async function fallbackSummary(
  supabase: SupabaseClient,
  hotelId: string,
  monthsBack: number,
): Promise<RevenueSummary> {
  const { data } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('hotel_id', hotelId)
    .eq('status', 'completed')

  const rows = (data ?? []) as { amount: number; created_at: string }[]
  const total = rows.reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const monthly = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (monthsBack - 1 - i))
    // Compare year *and* month — bucketing on getMonth() alone folded the same
    // month from different years into one bar.
    const revenue = rows
      .filter(p => {
        const at = new Date(p.created_at)
        return at.getFullYear() === d.getFullYear() && at.getMonth() === d.getMonth()
      })
      .reduce((s, p) => s + Number(p.amount ?? 0), 0)
    return { month: d.toLocaleDateString('en', { month: 'short' }), revenue, bookings: 0 }
  })

  return { total, monthly }
}
