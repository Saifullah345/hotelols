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
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-start justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary-500 rounded-full" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Revenue Overview</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-gray-900">{formatCurrency(total, currency)}</p>
          <p className="text-xs text-gray-400">Total earned</p>
        </div>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
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

            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: '#e0e7ff', strokeWidth: 1.5 }} />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}