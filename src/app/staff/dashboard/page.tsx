import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserCheck, Clock, BedDouble, ClipboardList } from 'lucide-react'

export const metadata = { title: 'Staff Dashboard' }

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: pendingBookings },
    { data: todayCheckIns },
    { data: todayCheckOuts },
    { count: maintenanceRooms },
  ] = await Promise.all([
    supabase.from('bookings').select('id, check_in, check_out, total_amount, user:profiles(full_name), room:rooms(room_number)')
      .eq('hotel_id', tenantId).eq('status', 'pending').order('check_in').limit(5),
    supabase.from('bookings').select('id, check_in, user:profiles(full_name), room:rooms(room_number)')
      .eq('hotel_id', tenantId).eq('status', 'confirmed').eq('check_in', today),
    supabase.from('bookings').select('id, check_out, user:profiles(full_name), room:rooms(room_number)')
      .eq('hotel_id', tenantId).eq('status', 'checked_in').eq('check_out', today),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId).eq('status', 'maintenance'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Front Desk</h2>
        <p className="text-gray-500 text-sm mt-1">Today: {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending Bookings', value: pendingBookings?.length ?? 0, icon: Clock, color: 'bg-orange-50 text-orange-600', href: '/staff/bookings' },
          { label: 'Check-ins Today', value: todayCheckIns?.length ?? 0, icon: UserCheck, color: 'bg-green-50 text-green-600', href: '/staff/checkin' },
          { label: 'Check-outs Today', value: todayCheckOuts?.length ?? 0, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', href: '/staff/bookings' },
          { label: 'Maintenance Rooms', value: maintenanceRooms ?? 0, icon: BedDouble, color: 'bg-red-50 text-red-600', href: '/staff/rooms' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="text-sm text-gray-500">{item.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Arrivals Today</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {todayCheckIns?.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{(b.user as { full_name?: string })?.full_name}</p>
                  <p className="text-xs text-gray-500">Room {(b.room as { room_number?: string })?.room_number}</p>
                </div>
                <Link href="/staff/checkin" className="btn-primary text-xs py-1.5 px-3">Check In</Link>
              </div>
            ))}
            {!todayCheckIns?.length && (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No arrivals today</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Departures Today</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {todayCheckOuts?.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{(b.user as { full_name?: string })?.full_name}</p>
                  <p className="text-xs text-gray-500">Room {(b.room as { room_number?: string })?.room_number}</p>
                </div>
                <span className="badge-yellow text-xs">Departing</span>
              </div>
            ))}
            {!todayCheckOuts?.length && (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No departures today</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
