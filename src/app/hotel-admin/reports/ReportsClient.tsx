'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  TrendingUp, CalendarCheck, Star, RefreshCw, FileDown, FileSpreadsheet,
  Calendar, X, Loader2, MoonStar,
} from 'lucide-react'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { formatCurrency } from '@/lib/currency'
import { currencyIcon } from '@/components/dashboard/CurrencyIcon'
import { todayISO } from '@/lib/date'
import {
  REPORT_RANGES, resolveWindow, summarise, revenueSeries, windowLabel,
  type PaymentRow, type BookingRow, type RoomRow, type ReviewRow,
} from '@/lib/reports'

interface Props {
  payments: PaymentRow[]
  bookings: BookingRow[]
  rooms: RoomRow[]
  reviews: ReviewRow[]
  currency: string
  /** Server's date, replaced by the viewer's own after mount. */
  serverToday: string
}

export default function ReportsClient({
  payments, bookings, rooms, reviews, currency, serverToday,
}: Props) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()

  const [range,      setRange]      = useState<string>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [exporting,  setExporting]  = useState<'pdf' | 'excel' | null>(null)

  // "Today" starts as the server's so the first paint matches, then becomes the
  // viewer's own date once mounted.
  const [today, setToday] = useState(serverToday)
  useEffect(() => { setToday(todayISO()) }, [])

  const window  = useMemo(() => resolveWindow(range, today, customFrom, customTo), [range, today, customFrom, customTo])
  const summary = useMemo(() => summarise(payments, bookings, rooms, reviews, window), [payments, bookings, rooms, reviews, window])
  const series  = useMemo(() => revenueSeries(payments, window, today), [payments, window, today])
  const label   = windowLabel(range, customFrom, customTo)

  const refresh = () => startRefresh(() => {
    router.refresh()
    toast.success('Reports updated')
  })

  const exportReport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const params = new URLSearchParams({ format, range, today })
      if (range === 'custom') {
        if (customFrom) params.set('from', customFrom)
        if (customTo)   params.set('to', customTo)
      }
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Could not generate the report')
        return
      }
      const blob = await res.blob()
      // Content-Disposition names the file; mirror it for the download link.
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const named = /filename="([^"]+)"/.exec(disposition)?.[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = named ?? `report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} report downloaded`)
    } catch {
      toast.error('Could not generate the report')
    } finally {
      setExporting(null)
    }
  }

  const chip = (active: boolean) =>
    `flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">
            Insights into your hotel performance · <span className="font-medium text-gray-700">{label}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <button
            onClick={() => exportReport('excel')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            {exporting === 'excel'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Excel
          </button>
          <button
            onClick={() => exportReport('pdf')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-60"
          >
            {exporting === 'pdf'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5" />}
            PDF
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <Calendar className="h-3.5 w-3.5" /> Period
          </span>
          {REPORT_RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} className={chip(range === r.key)}>
              {r.label}
            </button>
          ))}
          <button onClick={() => setRange('custom')} className={chip(range === 'custom')}>Custom</button>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={e => setCustomTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo('') }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Clear dates"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenue" value={formatCurrency(summary.revenue, currency)} icon={currencyIcon(currency)}
          iconBg="bg-green-50" iconColor="text-green-600" />
        <StatsCard title="Bookings" value={summary.bookings} icon={CalendarCheck}
          iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatsCard title="Occupancy Rate" value={summary.occupancyRate} icon={TrendingUp} suffix="%"
          iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatsCard title="Avg Rating" value={summary.avgRating} icon={Star}
          iconBg="bg-gold-50" iconColor="text-gold-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Nights Sold" value={summary.nightsSold} icon={MoonStar}
          iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <StatsCard title="Avg per Booking" value={formatCurrency(summary.avgBookingValue, currency)} icon={currencyIcon(currency)}
          iconBg="bg-teal-50" iconColor="text-teal-600" />
        <StatsCard title="Payments" value={summary.paymentsCount} icon={CalendarCheck}
          iconBg="bg-sky-50" iconColor="text-sky-600" />
        <StatsCard title="Cancelled" value={summary.cancelled} icon={X}
          iconBg="bg-rose-50" iconColor="text-rose-600" />
      </div>

      <RevenueChart data={series} currency={currency} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Room Status Breakdown</h3>
          <div className="space-y-3">
            {['available', 'booked', 'maintenance', 'cleaning'].map(status => {
              const count = summary.roomsByStatus[status] ?? 0
              const pct = summary.roomTotal ? Math.round((count / summary.roomTotal) * 100) : 0
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{status}</span>
                    <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Payment Method</h3>
          {summary.revenueByMethod.length ? (
            <div className="space-y-3">
              {summary.revenueByMethod.map(m => (
                <div key={m.method} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{m.method.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(m.amount, currency)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(summary.revenue, currency)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No payments in this period.</p>
          )}

          {summary.bookingsBySource.length > 0 && (
            <>
              <h3 className="font-semibold text-gray-900 mt-6 mb-3">Bookings by Source</h3>
              <div className="space-y-2">
                {summary.bookingsBySource.map(s => (
                  <div key={s.source} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{s.source.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
