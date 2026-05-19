import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'
import BookingActions from './BookingActions'

export const metadata = { title: 'Bookings' }

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

export default async function BookingsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  let query = supabase
    .from('bookings')
    .select('*, user:profiles(full_name, email), room:rooms(room_number, room_type:room_types(name))')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: bookings } = await query

  const filterTabs = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <p className="text-gray-500 text-sm mt-1">{bookings?.length ?? 0} bookings</p>
        </div>
        <Link href="/hotel-admin/bookings/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <Link
            key={tab}
            href={tab === 'all' ? '/hotel-admin/bookings' : `/hotel-admin/bookings?status=${tab}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              (tab === 'all' && !status) || status === tab
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab === 'all' ? 'All' : tab.replace('_', ' ')}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Guest</th>
              <th className="table-header">Room</th>
              <th className="table-header">Check-in</th>
              <th className="table-header">Check-out</th>
              <th className="table-header">Guests</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings?.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <p className="font-medium">{(b.user as { full_name?: string })?.full_name}</p>
                  <p className="text-xs text-gray-500">{(b.user as { email?: string })?.email}</p>
                </td>
                <td className="table-cell">
                  <p>Room {(b.room as { room_number?: string })?.room_number}</p>
                  <p className="text-xs text-gray-500">{((b.room as { room_type?: { name?: string } })?.room_type)?.name}</p>
                </td>
                <td className="text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(b.check_in).toLocaleDateString()}
                </td>
                <td className="table-cell text-gray-500">{new Date(b.check_out).toLocaleDateString()}</td>
                <td className="table-cell text-gray-500">{b.guests}</td>
                <td className="table-cell font-semibold">${b.total_amount}</td>
                <td className="table-cell">
                  <span className={statusBadge[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
                </td>
                <td className="table-cell">
                  <BookingActions bookingId={b.id} currentStatus={b.status} />
                </td>
              </tr>
            ))}
            {!bookings?.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
