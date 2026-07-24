import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BedDouble, Search, Pencil } from 'lucide-react'
import RoomStatusToggle from './RoomStatusToggle'
import DeleteRoomButton from './DeleteRoomButton'
import AutoFilterForm from '@/components/ui/AutoFilterForm'
import { formatCurrency } from '@/lib/currency'

export const metadata = { title: 'Rooms' }

const statusBadge: Record<string, string> = {
  available: 'badge-green', booked: 'badge-blue',
  maintenance: 'badge-red', cleaning: 'badge-yellow',
}

const STATUSES = ['available', 'booked', 'maintenance', 'cleaning']

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  let query = supabase
    .from('rooms')
    .select('*, room_type:room_types(name)')
    .eq('hotel_id', tenantId)
    .order('room_number')

  if (status) query = query.eq('status', status)
  if (q)      query = query.ilike('room_number', `%${q}%`)

  const { data: rooms } = await query

  const { data: allRooms } = await supabase
    .from('rooms').select('status').eq('hotel_id', tenantId)

  const { data: hotelInfo } = await supabase.from('hotels').select('currency').eq('id', tenantId).single()
  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  const available   = allRooms?.filter(r => r.status === 'available').length ?? 0
  const booked      = allRooms?.filter(r => r.status === 'booked').length ?? 0
  const maintenance = allRooms?.filter(r => r.status === 'maintenance').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
          <p className="text-gray-500 text-sm mt-1">{rooms?.length ?? 0} rooms shown</p>
        </div>
        <Link href="/hotel-admin/rooms/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Room
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available', count: available, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Occupied',  count: booked,    color: 'bg-blue-50 text-blue-700 border-blue-200'   },
          { label: 'Maintenance', count: maintenance, color: 'bg-red-50 text-red-700 border-red-200'  },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <AutoFilterForm className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search room number…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {(status || q) && (
          <Link href="/hotel-admin/rooms" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Room</th>
              <th className="table-header">Type</th>
              <th className="table-header">Floor</th>
              <th className="table-header">Capacity</th>
              <th className="table-header">Price/Night</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms?.map(room => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Room {room.room_number}</p>
                      {room.name && (
                        <p className="text-xs text-gray-400 mt-0.5">{room.name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="table-cell text-gray-500">{(room.room_type as { name?: string })?.name}</td>
                <td className="table-cell text-gray-500">Floor {room.floor}</td>
                <td className="table-cell text-gray-500">{room.capacity} guests</td>
                <td className="table-cell font-medium">{formatCurrency(room.price_per_night, currency)}</td>
                <td className="table-cell">
                  <span className={`${statusBadge[room.status] ?? 'badge-gray'} capitalize`}>{room.status}</span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <RoomStatusToggle roomId={room.id} currentStatus={room.status} />
                    <Link
                      href={`/hotel-admin/rooms/${room.id}/edit`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <DeleteRoomButton roomId={room.id} />
                  </div>
                </td>
              </tr>
            ))}
            {!rooms?.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No rooms match your filters.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
