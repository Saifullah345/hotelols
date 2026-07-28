import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { BedDouble, CalendarCheck, Clock, TrendingUp, Building2, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { currencyIcon } from '@/components/dashboard/CurrencyIcon'

export const metadata = { title: 'Dashboard' }

export default async function HotelAdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Account not linked to a hotel</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Your account has been created but hasn&apos;t been assigned to a hotel yet.
          Please contact your super admin to complete the setup.
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const [{ data: hotelInfo }, { count: totalRooms },
    { count: availableRooms },
    { count: totalBookings },
    { count: pendingBookings },
    { data: revenueData },
    { data: recentBookings },
    { count: checkedInToday },
    { count: bookedToday },
  ] = await Promise.all([
    supabase.from('hotels').select('currency, name, city').eq('id', tenantId).single(),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId).eq('status', 'available'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId).eq('status', 'pending'),
    supabase.from('payments').select('amount, created_at').eq('hotel_id', tenantId).eq('status', 'completed'),
    supabase.from('bookings')
      .select('id, status, check_in, check_out, total_amount, guest_name, user:profiles(full_name, email), room:rooms(room_number)')
      .eq('hotel_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('hotel_id', tenantId).eq('status', 'checked_in').eq('check_in', today),
    // Reservations taken today, whatever their stay dates — the day's intake.
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('hotel_id', tenantId).gte('created_at', `${today}T00:00:00`),
  ])

  const hotel = hotelInfo as { currency?: string; name?: string; city?: string } | null
  const currency = hotel?.currency ?? 'USD'
  const hotelName = hotel?.name ?? 'Your Hotel'
  const hotelCity = hotel?.city
  const totalRevenue = revenueData?.reduce((s, p) => s + p.amount, 0) ?? 0
  const occupancyRate = totalRooms ? Math.round(((totalRooms - (availableRooms ?? 0)) / totalRooms) * 100) : 0

  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleDateString('en', { month: 'short' })
    const revenue = revenueData?.filter(p => new Date(p.created_at).getMonth() === d.getMonth())
      .reduce((s, p) => s + p.amount, 0) ?? 0
    return { month, revenue, bookings: 0 }
  })

  const stats = [
    { title: 'Total Rooms', value: totalRooms ?? 0, icon: BedDouble, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', href: '/hotel-admin/rooms' },
    { title: 'Available Rooms', value: availableRooms ?? 0, icon: BedDouble, iconBg: 'bg-green-50', iconColor: 'text-green-600', href: '/hotel-admin/rooms?status=available' },
    { title: 'Total Bookings', value: totalBookings ?? 0, icon: CalendarCheck, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', change: 15, href: '/hotel-admin/bookings' },
    { title: 'Total Revenue', value: formatCurrency(totalRevenue, currency), icon: currencyIcon(currency), iconBg: 'bg-green-50', iconColor: 'text-green-600', change: 8, href: '/hotel-admin/reports' },
  ]

  const statusColors: Record<string, string> = {
    pending: 'badge-yellow', confirmed: 'badge-blue',
    checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-indigo-200 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <Sparkles className="h-3 w-3" />
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Welcome back!
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              {hotelName}{hotelCity ? ` · ${hotelCity}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl text-sm">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-white font-bold leading-none">{pendingBookings}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Pending</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{occupancyRate}%</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Occupancy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => <StatsCard key={stat.title} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={monthlyRevenue} currency={currency} />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
            <h3 className="font-semibold text-gray-900">Today&apos;s Overview</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Bookings Today', value: bookedToday ?? 0, bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
              { label: 'Check-ins Today', value: checkedInToday ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
              { label: 'Pending Bookings', value: pendingBookings ?? 0, bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
              { label: 'Occupancy Rate', value: `${occupancyRate}%`, bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
            ].map(item => (
              <div key={item.label} className={`flex justify-between items-center px-3 py-2.5 rounded-xl ${item.bg}`}>
                <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                <span className={`text-lg font-extrabold ${item.text}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
          <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">Guest</th>
                <th className="table-header">Room</th>
                <th className="table-header">Check-in</th>
                <th className="table-header">Check-out</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings?.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">
                    {(b.user as { full_name?: string } | null)?.full_name
                      || (b as { guest_name?: string }).guest_name
                      || (b.user as { email?: string } | null)?.email
                      || '—'}
                  </td>
                  <td className="table-cell text-gray-500">Room {(b.room as { room_number?: string })?.room_number}</td>
                  <td className="table-cell text-gray-500">{new Date(b.check_in).toLocaleDateString()}</td>
                  <td className="table-cell text-gray-500">{new Date(b.check_out).toLocaleDateString()}</td>
                  <td className="table-cell font-medium">{formatCurrency(b.total_amount, currency)}</td>
                  <td className="table-cell">
                    <span className={statusColors[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
              {!recentBookings?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
