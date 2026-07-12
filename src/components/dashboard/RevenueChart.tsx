'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency'

interface TooltipPayload {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  currency?: string
}

function CustomTooltip({ active, payload, label, currency = 'USD' }: TooltipPayload) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-left">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  )
}

interface RevenueChartProps {
  data: { month: string; revenue: number; bookings: number }[]
  currency?: string
}

export function RevenueChart({ data, currency = 'USD' }: RevenueChartProps) {
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const maxRevenue = Math.max(...data.map(d => d.revenue), 0)
  const yMax = maxRevenue ? Math.ceil((maxRevenue * 1.25) / 500) * 500 : 500

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(total, currency)}</p>
          <p className="text-xs text-gray-400">Total revenue</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => formatCurrencyCompact(v, currency)}
            tickCount={5}
            domain={[0, yMax]}
            width={56}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
