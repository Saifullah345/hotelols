import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

export const metadata = { title: 'Bookings' }

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

export default async function StaffBookingsPage({
  searchParams,
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
    .select('*, room:rooms(room_number, room_type:room_types(name))')
    .eq('hotel_id', tenantId)
    .order('check_in', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data: bookings } = await query

  // Staff have no RLS read access to customer profiles, so the usual
  // `user:profiles(...)` join comes back empty. Resolve registered guests'
  // names with the service-role client, scoped to this hotel's bookings.
  const guestIds = Array.from(
    new Set((bookings ?? []).map(b => b.user_id).filter((id): id is string => !!id)),
  )
  let guestMap: Record<string, { full_name?: string; email?: string }> = {}
  if (guestIds.length) {
    const admin = await createAdminClient()
    const { data: guests } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', guestIds)
    guestMap = Object.fromEntries((guests ?? []).map(g => [g.id, g]))
  }

  const filterTabs = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
        <p className="text-gray-500 text-sm mt-1">{bookings?.length ?? 0} bookings</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <Link
            key={tab}
            href={tab === 'all' ? '/staff/bookings' : `/staff/bookings?status=${tab}`}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings?.map(b => {
              const guest = b.user_id ? guestMap[b.user_id] : undefined
              const guestName = guest?.full_name || (b.guest_name as string | null) || 'Walk-in guest'
              const guestContact = guest?.email || (b.guest_phone as string | null) || ''
              return (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <p className="font-medium">{guestName}</p>
                  <p className="text-xs text-gray-500">{guestContact}</p>
                </td>
                <td className="table-cell">
                  <p>Room {(b.room as { room_number?: string })?.room_number}</p>
                  <p className="text-xs text-gray-500">{((b.room as { room_type?: { name?: string } })?.room_type)?.name}</p>
                </td>
                <td className="table-cell text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(b.check_in).toLocaleDateString()}
                  </div>
                </td>
                <td className="table-cell text-gray-500">{new Date(b.check_out).toLocaleDateString()}</td>
                <td className="table-cell text-gray-500">{b.guests}</td>
                <td className="table-cell font-semibold">${b.total_amount}</td>
                <td className="table-cell">
                  <span className={statusBadge[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
                </td>
              </tr>
              )
            })}
            {!bookings?.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
