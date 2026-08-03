'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, CalendarCheck, Star, RefreshCw, Download,
  Calendar, X, Loader2, MoonStar,
} from 'lucide-react'
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
  serverToday: string
  roomTypeRevenue: { name: string; revenue: number }[]
  topGuests: { name: string; country: string; spend: number }[]
}

const DONUT_COLORS = ['#EC4899', '#3B82F6', '#D97706', '#A855F7', '#10B981', '#6B7280']
const STATUS_COLORS: Record<string, string> = {
  checked_in:  '#10B981',
  confirmed:   '#3B82F6',
  checked_out: '#A855F7',
  cancelled:   '#EF4444',
  pending:     '#F59E0B',
}
const AVATAR_BG = ['#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#EC4899']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function ReportsClient({
  payments, bookings, rooms, reviews, currency, serverToday,
  roomTypeRevenue, topGuests,
}: Props) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()

  const [range,      setRange]      = useState<string>('year')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [exporting,  setExporting]  = useState<'pdf' | 'excel' | null>(null)

  const [today, setToday] = useState(serverToday)
  useEffect(() => { setToday(todayISO()) }, [])

  const win     = useMemo(() => resolveWindow(range, today, customFrom, customTo), [range, today, customFrom, customTo])
  const summary = useMemo(() => summarise(payments, bookings, rooms, reviews, win),  [payments, bookings, rooms, reviews, win])
  const series  = useMemo(() => revenueSeries(payments, win, today),                 [payments, win, today])
  const label   = windowLabel(range, customFrom, customTo)

  // Booking status mix (all bookings, not date-filtered)
  const statusMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of bookings) counts.set(b.status, (counts.get(b.status) ?? 0) + 1)
    return [...counts.entries()]
      .map(([key, value]) => ({ name: key.replace(/_/g, ' '), key, value }))
      .sort((a, b) => b.value - a.value)
  }, [bookings])

  const rtChartData = useMemo(
    () => roomTypeRevenue.map(r => ({ name: r.name, value: r.revenue })),
    [roomTypeRevenue],
  )

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
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const named = /filename="([^"]+)"/.exec(disposition)?.[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = named ?? `report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a); a.click(); a.remove()
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
      active
        ? 'bg-primary-600 text-white shadow-sm'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`

  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    fontSize: '13px',
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics &amp; Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, occupancy and booking performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-primary-200"
          >
            {exporting === 'excel'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Date filter ────────────────────────────────────────── */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
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
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={e => setCustomTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {(customFrom || customTo) && (
                <button onClick={() => { setCustomFrom(''); setCustomTo('') }} className="text-gray-400 hover:text-gray-600 p-1" title="Clear">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenue"    value={formatCurrency(summary.revenue, currency)}      icon={currencyIcon(currency)} iconBg="bg-amber-50"   iconColor="text-amber-600" />
        <StatsCard title="Bookings"   value={summary.bookings}                               icon={CalendarCheck}          iconBg="bg-blue-50"    iconColor="text-blue-600" />
        <StatsCard title="Occupancy"  value={summary.occupancyRate}                          icon={TrendingUp}             iconBg="bg-emerald-50" iconColor="text-emerald-600" suffix="%" />
        <StatsCard title="Avg Rating" value={summary.avgRating}                              icon={Star}                   iconBg="bg-purple-50"  iconColor="text-purple-600" />
      </div>

      {/* ── Charts row 1: bar + donut ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Revenue */}
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Monthly Revenue</h3>
            <p className="text-xs text-gray-400 mt-0.5">Collected payments — {label}</p>
          </div>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']}
                  cursor={{ fill: '#fef3c7', radius: 4 }}
                />
                <Bar dataKey="revenue" fill="#D97706" radius={[5, 5, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              No payment data for this period
            </div>
          )}
        </div>

        {/* Revenue by Room Type */}
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Revenue by Room Type</h3>
            <p className="text-xs text-gray-400 mt-0.5">Completed stays contribution</p>
          </div>
          {rtChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={rtChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                  stroke="#fff"
                  strokeWidth={2}
                  label={({ name, percent }) =>
                    (percent as number) > 0.06 ? name : ''
                  }
                  labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                >
                  {rtChartData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              No room type data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Charts row 2: pie + guest list ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Booking Status Mix */}
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Booking Status Mix</h3>
            <p className="text-xs text-gray-400 mt-0.5">All reservations by current status</p>
          </div>
          {statusMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusMix}
                  cx="48%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={1}
                  label={({ name, percent }) =>
                    (percent as number) > 0.06 ? name : ''
                  }
                  labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                >
                  {statusMix.map((item, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[item.key] ?? DONUT_COLORS[i % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [v, 'Bookings']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              No booking data yet
            </div>
          )}
        </div>

        {/* Top Guests by Spend */}
        <div className="card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-[15px]">Top Guests by Spend</h3>
            <p className="text-xs text-gray-400 mt-0.5">Highest-spending guests (all time)</p>
          </div>
          {topGuests.length > 0 ? (
            <div className="space-y-1">
              {topGuests.slice(0, 5).map((guest, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span className="w-5 text-xs font-semibold text-gray-400 text-center flex-shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
                    style={{ backgroundColor: AVATAR_BG[i % AVATAR_BG.length] }}
                  >
                    {initials(guest.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{guest.name}</p>
                    {guest.country && (
                      <p className="text-xs text-gray-400 truncate">{guest.country}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">
                    {formatCurrency(guest.spend, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              No guest data yet
            </div>
          )}
          {/* Extra stats below the list */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Nights Sold</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{summary.nightsSold}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Avg per Booking</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(summary.avgBookingValue, currency)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
