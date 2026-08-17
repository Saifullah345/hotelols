import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckInActions from './CheckInActions'
import CheckInNotifier from './CheckInNotifier'
import { UserCheck, AlertCircle, Clock } from 'lucide-react'

export const metadata = { title: 'Check-In / Check-Out' }

export default async function CheckInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: arrivals }, { data: departures }, { data: overdue }] = await Promise.all([
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
    supabase.from('bookings')
      .select('*, user:profiles(full_name, email), room:rooms(room_number)')
      .eq('hotel_id', tenantId)
      .eq('status', 'checked_in')
      .lt('check_out', today)
      .order('check_out'),
  ])

  const overdueCount   = overdue?.length ?? 0
  const departingCount = departures?.length ?? 0

  return (
    <div className="space-y-6">
      <CheckInNotifier overdueCount={overdueCount} departingCount={departingCount} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-In / Check-Out</h2>
          <p className="text-gray-500 text-sm mt-1">Today: {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium animate-pulse">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {overdueCount} overdue checkout{overdueCount > 1 ? 's' : ''} — room{overdueCount > 1 ? 's' : ''} blocked
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <p className="font-medium text-gray-900">
                      Room {(b.room as { room_number?: string })?.room_number}
                      {(b.room_ids?.length ?? 0) > 1 && (
                        <span className="text-blue-600"> +{b.room_ids.length - 1} more</span>
                      )}
                    </p>
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

        {/* Departures Today */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Departures Today</h3>
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{departingCount}</span>
          </div>
          <div className="divide-y divide-gray-100 mt-2">
            {departures?.map(b => (
              <div key={b.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{(b.user as { full_name?: string })?.full_name}</p>
                    <p className="text-sm text-gray-500">
                      Room {(b.room as { room_number?: string })?.room_number}
                      {(b.room_ids?.length ?? 0) > 1 && (
                        <span className="text-blue-600"> +{b.room_ids.length - 1} more</span>
                      )}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">${b.total_amount}</p>
                </div>
                <CheckInActions bookingId={b.id} action="check_out" />
              </div>
            ))}
            {!departingCount && (
              <div className="p-8 text-center text-gray-500 text-sm">No departures today</div>
            )}
          </div>
        </div>

        {/* Overdue Checkouts */}
        <div className={`card ${overdueCount > 0 ? 'border-red-200' : ''}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${overdueCount > 0 ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}>
            <AlertCircle className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            <h3 className={`font-semibold ${overdueCount > 0 ? 'text-red-800' : 'text-gray-900'}`}>Overdue Checkouts</h3>
            <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              {overdueCount}
            </span>
          </div>
          <div className="divide-y divide-gray-100 mt-2">
            {overdue?.map(b => {
              const daysOverdue = Math.round(
                (new Date(today).getTime() - new Date(b.check_out + 'T00:00:00').getTime()) / 86_400_000
              )
              return (
                <div key={b.id} className="p-4 space-y-2 bg-red-50/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{(b.user as { full_name?: string })?.full_name}</p>
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          {daysOverdue}d overdue
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Room {(b.room as { room_number?: string })?.room_number}
                        {(b.room_ids?.length ?? 0) > 1 && (
                          <span className="text-blue-600"> +{b.room_ids.length - 1} more</span>
                        )}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">Was due: {new Date(b.check_out + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <p className="font-medium text-gray-900 flex-shrink-0">${b.total_amount}</p>
                  </div>
                  <CheckInActions bookingId={b.id} action="check_out" isOverdue />
                </div>
              )
            })}
            {!overdueCount && (
              <div className="p-8 text-center text-gray-400 text-sm">All guests checked out on time</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
