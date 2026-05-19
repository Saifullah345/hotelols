import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckInActions from './CheckInActions'
import { UserCheck } from 'lucide-react'

export const metadata = { title: 'Check-In / Check-Out' }

export default async function CheckInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: arrivals }, { data: departures }] = await Promise.all([
    supabase.from('bookings')
      .select('*, user:profiles(full_name, email, phone), room:rooms(room_number, floor)')
      .eq('hotel_id', tenantId)
      .eq('check_in', today)
      .eq('status', 'confirmed')
      .order('check_in'),
    supabase.from('bookings')
      .select('*, user:profiles(full_name, email), room:rooms(room_number)')
      .eq('hotel_id', tenantId)
      .eq('check_out', today)
      .eq('status', 'checked_in')
      .order('check_out'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Check-In / Check-Out</h2>
        <p className="text-gray-500 text-sm mt-1">Today: {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrivals */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Arrivals Today</h3>
            <span className="ml-auto badge-green">{arrivals?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {arrivals?.map(b => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{(b.user as { full_name?: string })?.full_name}</p>
                    <p className="text-sm text-gray-500">{(b.user as { email?: string })?.email}</p>
                    {(b.user as { phone?: string })?.phone && (
                      <p className="text-sm text-gray-500">📞 {(b.user as { phone?: string })?.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">Room {(b.room as { room_number?: string })?.room_number}</p>
                    <p className="text-xs text-gray-500">Floor {(b.room as { floor?: number })?.floor}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {b.guests} guest{b.guests > 1 ? 's' : ''} · ${b.total_amount}
                  </div>
                  <CheckInActions bookingId={b.id} action="check_in" />
                </div>
              </div>
            ))}
            {!arrivals?.length && (
              <div className="p-8 text-center text-gray-500 text-sm">No arrivals today</div>
            )}
          </div>
        </div>

        {/* Departures */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <span className="text-blue-600">🚪</span>
            <h3 className="font-semibold text-gray-900">Departures Today</h3>
            <span className="ml-auto badge-blue">{departures?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {departures?.map(b => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{(b.user as { full_name?: string })?.full_name}</p>
                    <p className="text-sm text-gray-500">Room {(b.room as { room_number?: string })?.room_number}</p>
                  </div>
                  <p className="font-medium text-gray-900">${b.total_amount}</p>
                </div>
                <CheckInActions bookingId={b.id} action="check_out" />
              </div>
            ))}
            {!departures?.length && (
              <div className="p-8 text-center text-gray-500 text-sm">No departures today</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
