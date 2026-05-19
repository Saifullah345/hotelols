import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { Building2, Users, CreditCard, TrendingUp, Hotel, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Super Admin Dashboard' }

export default async function SuperAdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalHotels },
    { count: activeHotels },
    { count: suspendedHotels },
    { count: totalUsers },
    { data: recentHotels },
    { data: planStats },
  ] = await Promise.all([
    supabase.from('hotels').select('*', { count: 'exact', head: true }),
    supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'super_admin'),
    supabase.from('hotels').select('id, name, status, created_at, plan:plans(name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('hotels').select('plan:plans(name)', { count: 'exact' }),
  ])

  const stats = [
    { title: 'Total Hotels', value: totalHotels ?? 0, icon: Hotel, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { title: 'Active Hotels', value: activeHotels ?? 0, icon: Building2, iconBg: 'bg-green-50', iconColor: 'text-green-600', change: 12 },
    { title: 'Suspended', value: suspendedHotels ?? 0, icon: AlertCircle, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
    { title: 'Total Users', value: totalUsers ?? 0, icon: Users, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', change: 8 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Monitor all hotels and platform activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => <StatsCard key={stat.title} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hotels */}
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Hotels</h3>
            <Link href="/super-admin/hotels" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentHotels?.map(hotel => (
              <div key={hotel.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{hotel.name}</p>
                  <p className="text-xs text-gray-500">{new Date(hotel.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{(hotel.plan as { name?: string })?.name}</span>
                  <span className={`badge-${hotel.status === 'active' ? 'green' : hotel.status === 'suspended' ? 'red' : 'yellow'}`}>
                    {hotel.status}
                  </span>
                </div>
              </div>
            ))}
            {!recentHotels?.length && (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No hotels yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/super-admin/hotels/new" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> Create New Hotel
            </Link>
            <Link href="/super-admin/plans" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" /> Manage Plans
            </Link>
            <Link href="/super-admin/users" className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Manage Users
            </Link>
          </div>

          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-semibold text-primary-900">Platform Health</span>
            </div>
            <p className="text-xs text-primary-700">
              {activeHotels ?? 0} hotels active · {totalUsers ?? 0} registered users
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
