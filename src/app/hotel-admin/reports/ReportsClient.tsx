'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  TrendingUp, CalendarCheck, Star, RefreshCw, Download,
  Calendar, X, Loader2, MoonStar, Lock, ArrowRight, BarChart2,
} from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { formatCurrency } from '@/lib/currency'
import { currencyIcon } from '@/components/dashboard/CurrencyIcon'
import { todayISO } from '@/lib/date'
import {
  REPORT_RANGES, resolveWindow, summarise, revenueSeries, windowLabel, inWindow,
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
  advancedReports: boolean
  totalRooms: number
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
  roomTypeRevenue, topGuests, advancedReports, totalRooms,
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

  // ── Advanced analytics computations ─────────────────────────────────
  const daysInPeriod = useMemo(() => {
    if (!win) return 365
    const to = Number.isFinite(win.to) ? win.to : Date.now()
    return Math.max(1, Math.round((to - win.from) / 86_400_000))
  }, [win])

  const revPAR = useMemo(() => {
    if (!totalRooms || !daysInPeriod) return 0
    return summary.revenue / (totalRooms * daysInPeriod)
  }, [summary.revenue, totalRooms, daysInPeriod])

  const avgLengthOfStay = useMemo(() => {
    const made = bookings.filter(b => inWindow(b.created_at, win) && b.status !== 'cancelled')
    if (!made.length) return 0
    const total = made.reduce((s, b) =>
      s + Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000)), 0)
    return total / made.length
  }, [bookings, win])

  const cancellationRate = useMemo(() =>
    summary.bookings > 0 ? Math.round((summary.cancelled / summary.bookings) * 100) : 0,
    [summary.bookings, summary.cancelled])

  const avgLeadTime = useMemo(() => {
    const made = bookings.filter(b => inWindow(b.created_at, win))
    if (!made.length) return 0
    const total = made.reduce((s, b) =>
      s + Math.max(0, Math.round((new Date(b.check_in).getTime() - new Date(b.created_at).getTime()) / 86_400_000)), 0)
    return Math.round(total / made.length)
  }, [bookings, win])

  const leadTimeData = useMemo(() => {
    const buckets = [
      { name: 'Same day', min: 0, max: 1, value: 0 },
      { name: '1–3 days', min: 1, max: 4, value: 0 },
      { name: '4–7 days', min: 4, max: 8, value: 0 },
      { name: '1–2 wks',  min: 8, max: 15, value: 0 },
      { name: '2–4 wks',  min: 15, max: 29, value: 0 },
      { name: '1+ month', min: 29, max: Infinity, value: 0 },
    ]
    for (const b of bookings.filter(bk => inWindow(bk.created_at, win))) {
      const days = Math.max(0, Math.round((new Date(b.check_in).getTime() - new Date(b.created_at).getTime()) / 86_400_000))
      const bucket = buckets.find(bc => days >= bc.min && days < bc.max)
      if (bucket) bucket.value++
    }
    return buckets.map(({ name, value }) => ({ name, value }))
  }, [bookings, win])

  const dayOfWeekData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const counts = new Array(7).fill(0)
    for (const b of bookings.filter(bk => inWindow(bk.created_at, win) && bk.status !== 'cancelled')) {
      const d = new Date(b.check_in).getDay()
      counts[(d + 6) % 7]++
    }
    return days.map((name, i) => ({ name, value: counts[i] }))
  }, [bookings, win])

  const cancellationTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const month = d.toLocaleDateString('en', { month: 'short' })
      const count = bookings.filter(b => {
        const t = new Date(b.created_at)
        return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear() && b.status === 'cancelled'
      }).length
      return { month, count }
    })
  }, [bookings])

  const sourceData = useMemo(
    () => summary.bookingsBySource.map(b => ({ name: b.source.replace(/_/g, ' '), value: b.count })),
    [summary.bookingsBySource])

  const paymentMethodData = useMemo(
    () => summary.revenueByMethod.map(m => ({ name: m.method.replace(/_/g, ' '), value: m.amount })),
    [summary.revenueByMethod])

  // ── Handlers ─────────────────────────────────────────────────────────
  const refresh = () => startRefresh(() => { router.refresh(); toast.success('Reports updated') })

  const exportReport = async (format: 'pdf' | 'excel') => {
    setExporting(format)
    try {
      const params = new URLSearchParams({ format, range, today })
      if (range === 'custom') {
        if (customFrom) params.set('from', customFrom)
        if (customTo)   params.set('to', customTo)
      }
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) { toast.error((await res.json().catch(() => ({}))).error ?? 'Could not generate the report'); return }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const named = /filename="([^"]+)"/.exec(disposition)?.[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = named ?? `report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} report downloaded`)
    } catch { toast.error('Could not generate the report') }
    finally { setExporting(null) }
  }

  const chip = (active: boolean) =>
    `flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: '13px' }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics &amp; Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, occupancy and booking performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
          <button onClick={() => exportReport('excel')} disabled={exporting !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-primary-200">
            {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
            <button key={r.key} onClick={() => setRange(r.key)} className={chip(range === r.key)}>{r.label}</button>
          ))}
          <button onClick={() => setRange('custom')} className={chip(range === 'custom')}>Custom</button>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} max={customTo || today} onChange={e => setCustomFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="date" value={customTo} min={customFrom || undefined} onChange={e => setCustomTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400" />
              {(customFrom || customTo) && (
                <button onClick={() => { setCustomFrom(''); setCustomTo('') }} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenue"    value={formatCurrency(summary.revenue, currency)}  icon={currencyIcon(currency)} iconBg="bg-amber-50"   iconColor="text-amber-600" />
        <StatsCard title="Bookings"   value={summary.bookings}                           icon={CalendarCheck}          iconBg="bg-blue-50"    iconColor="text-blue-600" />
        <StatsCard title="Occupancy"  value={summary.occupancyRate}                      icon={TrendingUp}             iconBg="bg-emerald-50" iconColor="text-emerald-600" suffix="%" />
        <StatsCard title="Avg Rating" value={summary.avgRating}                          icon={Star}                   iconBg="bg-purple-50"  iconColor="text-purple-600" />
      </div>

      {/* ── Charts row 1 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Monthly Revenue</h3>
            <p className="text-xs text-gray-400 mt-0.5">Collected payments — {label}</p>
          </div>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} debounce={1}>
              <BarChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']} cursor={{ fill: '#fef3c7', radius: 4 }} />
                <Bar dataKey="revenue" fill="#D97706" radius={[5, 5, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No payment data for this period</div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Revenue by Room Type</h3>
            <p className="text-xs text-gray-400 mt-0.5">Completed stays contribution</p>
          </div>
          {rtChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} debounce={1}>
              <PieChart>
                <Pie data={rtChartData} cx="50%" cy="50%" innerRadius={58} outerRadius={85} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={2}
                  label={({ name, percent }) => (percent as number) > 0.06 ? name : ''} labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}>
                  {rtChartData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v, currency), 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No room type data yet</div>
          )}
        </div>
      </div>

      {/* ── Charts row 2 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 text-[15px]">Booking Status Mix</h3>
            <p className="text-xs text-gray-400 mt-0.5">All reservations by current status</p>
          </div>
          {statusMix.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} debounce={1}>
              <PieChart>
                <Pie data={statusMix} cx="48%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" paddingAngle={1}
                  label={({ name, percent }) => (percent as number) > 0.06 ? name : ''} labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}>
                  {statusMix.map((item, i) => <Cell key={i} fill={STATUS_COLORS[item.key] ?? DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Bookings']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No booking data yet</div>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-[15px]">Top Guests by Spend</h3>
            <p className="text-xs text-gray-400 mt-0.5">Highest-spending guests (all time)</p>
          </div>
          {topGuests.length > 0 ? (
            <div className="space-y-1">
              {topGuests.slice(0, 5).map((guest, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="w-5 text-xs font-semibold text-gray-400 text-center flex-shrink-0 tabular-nums">{i + 1}</span>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
                    style={{ backgroundColor: AVATAR_BG[i % AVATAR_BG.length] }}>
                    {initials(guest.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{guest.name}</p>
                    {guest.country && <p className="text-xs text-gray-400 truncate">{guest.country}</p>}
                  </div>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0 tabular-nums">{formatCurrency(guest.spend, currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">No guest data yet</div>
          )}
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

      {/* ══════════════════════════════════════════════════════════
          ADVANCED ANALYTICS
      ══════════════════════════════════════════════════════════ */}
      <div>
        {/* Section divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide ${
            advancedReports
              ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
              : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            <BarChart2 className="h-3.5 w-3.5" />
            Advanced Analytics
            {!advancedReports && <Lock className="h-3 w-3" />}
          </div>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {advancedReports ? (
          <div className="space-y-6">

            {/* Advanced KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'RevPAR', value: formatCurrency(revPAR, currency), sub: 'Revenue per available room/day', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Avg Stay', value: `${avgLengthOfStay.toFixed(1)} nights`, sub: 'Average length of stay', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Cancel Rate', value: `${cancellationRate}%`, sub: `${summary.cancelled} of ${summary.bookings} bookings`, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Avg Lead Time', value: `${avgLeadTime} days`, sub: 'Days before check-in booked', color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(item => (
                <div key={item.label} className={`card p-5 border-l-4 ${item.bg} border-l-current`} style={{ borderLeftColor: item.color.replace('text-', '') }}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-2xl font-extrabold mt-1 tabular-nums ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Lead Time + Day of Week */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-[15px]">Booking Lead Time</h3>
                  <p className="text-xs text-gray-400 mt-0.5">How far in advance guests book</p>
                </div>
                <ResponsiveContainer width="100%" height={200} debounce={1}>
                  <BarChart data={leadTimeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Bookings']} cursor={{ fill: '#eef2ff', radius: 4 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-[15px]">Check-in Day Pattern</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Which days guests most often arrive</p>
                </div>
                <ResponsiveContainer width="100%" height={200} debounce={1}>
                  <BarChart data={dayOfWeekData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Check-ins']} cursor={{ fill: '#ecfdf5', radius: 4 }} />
                    <Bar dataKey="value" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Booking Source + Cancellation Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 text-[15px]">Booking Source</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Where bookings are coming from</p>
                </div>
                {sourceData.length > 0 ? (
                  <div className="space-y-3">
                    {sourceData.slice(0, 6).map((item, i) => {
                      const total = sourceData.reduce((s, x) => s + x.value, 0)
                      const pct = total ? Math.round((item.value / total) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 flex-shrink-0 capitalize truncate">{item.name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-900 w-6 text-right tabular-nums">{item.value}</span>
                          <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-[160px] flex items-center justify-center text-sm text-gray-400">No source data yet</div>
                )}
              </div>

              <div className="card p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-[15px]">Cancellation Trend</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Monthly cancellations — last 6 months</p>
                </div>
                <ResponsiveContainer width="100%" height={200} debounce={1}>
                  <LineChart data={cancellationTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Cancellations']} />
                    <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2.5}
                      dot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            {paymentMethodData.length > 0 && (
              <div className="card p-6">
                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 text-[15px]">Revenue by Payment Method</h3>
                  <p className="text-xs text-gray-400 mt-0.5">How guests pay for their stays</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {paymentMethodData.map((item, i) => {
                    const total = paymentMethodData.reduce((s, x) => s + x.value, 0)
                    const pct = total ? Math.round((item.value / total) * 100) : 0
                    const colors = ['bg-indigo-50 text-indigo-700', 'bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-purple-50 text-purple-700', 'bg-blue-50 text-blue-700']
                    return (
                      <div key={i} className={`rounded-xl p-4 text-center ${colors[i % colors.length]}`}>
                        <p className="text-xs font-semibold capitalize mb-1 opacity-70">{item.name}</p>
                        <p className="text-base font-extrabold tabular-nums">{formatCurrency(item.value, currency)}</p>
                        <p className="text-xs mt-0.5 opacity-60">{pct}% of total</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upgrade CTA */
          <div className="relative rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-violet-50/70 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-indigo-100">
              <Lock className="h-6 w-6 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Unlock Advanced Analytics</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
              Get RevPAR tracking, lead time distribution, check-in day patterns, cancellation trends, booking source breakdown, and payment method analytics.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['RevPAR', 'Avg Length of Stay', 'Lead Time', 'Day Pattern', 'Cancellation Trend', 'Payment Methods', 'Booking Source'].map(f => (
                <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-indigo-100 text-xs font-medium text-indigo-600">
                  <Lock className="h-2.5 w-2.5" /> {f}
                </span>
              ))}
            </div>
            <Link href="/hotel-admin/billing" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-200">
              Upgrade Plan <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-gray-400">Available on Growth, Pro, and Enterprise plans</p>
          </div>
        )}
      </div>
    </div>
  )
}
