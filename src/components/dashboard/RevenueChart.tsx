'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface RevenueChartProps {
  data: { month: string; revenue: number; bookings: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-6">Revenue Overview</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Area
            type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2}
            fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
