import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { DollarSign, TrendingUp, CalendarCheck, Star } from 'lucide-react'

export const metadata = { title: 'Reports & Analytics' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const [
    { data: payments },
    { count: totalBookings },
    { data: rooms },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('payments').select('amount, created_at, status').eq('hotel_id', tenantId).eq('status', 'completed'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId),
    supabase.from('rooms').select('status').eq('hotel_id', tenantId),
    supabase.from('reviews').select('rating').eq('hotel_id', tenantId),
  ])

  const totalRevenue = payments?.reduce((s, p) => s + p.amount, 0) ?? 0
  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'
  const availableRooms = rooms?.filter(r => r.status === 'available').length ?? 0
  const occupancyRate = rooms?.length
    ? Math.round(((rooms.length - availableRooms) / rooms.length) * 100)
    : 0

  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i))
    return {
      month: d.toLocaleDateString('en', { month: 'short' }),
      revenue: payments?.filter(p => new Date(p.created_at).getMonth() === d.getMonth() && new Date(p.created_at).getFullYear() === d.getFullYear())
        .reduce((s, p) => s + p.amount, 0) ?? 0,
      bookings: 0,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 text-sm mt-1">Insights into your hotel performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={totalRevenue} icon={DollarSign} prefix="$"
          iconBg="bg-green-50" iconColor="text-green-600" change={12} />
        <StatsCard title="Total Bookings" value={totalBookings ?? 0} icon={CalendarCheck}
          iconBg="bg-blue-50" iconColor="text-blue-600" change={8} />
        <StatsCard title="Occupancy Rate" value={occupancyRate} icon={TrendingUp} suffix="%"
          iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatsCard title="Avg Rating" value={avgRating} icon={Star}
          iconBg="bg-gold-50" iconColor="text-gold-600" />
      </div>

      <RevenueChart data={monthlyRevenue} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Room Status Breakdown</h3>
          <div className="space-y-3">
            {['available', 'booked', 'maintenance', 'cleaning'].map(status => {
              const count = rooms?.filter(r => r.status === status).length ?? 0
              const pct = rooms?.length ? Math.round((count / rooms.length) * 100) : 0
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
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold text-gray-900">${monthlyRevenue[11]?.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Month</span>
              <span className="font-semibold text-gray-900">${monthlyRevenue[10]?.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Year Total</span>
              <span className="font-semibold text-gray-900">${totalRevenue.toLocaleString()}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg per Booking</span>
                <span className="font-semibold text-gray-900">
                  ${totalBookings ? Math.round(totalRevenue / totalBookings).toLocaleString() : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
