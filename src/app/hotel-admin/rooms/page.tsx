import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BedDouble } from 'lucide-react'
import RoomStatusToggle from './RoomStatusToggle'

export const metadata = { title: 'Rooms' }

const statusBadge: Record<string, string> = {
  available: 'badge-green', booked: 'badge-blue',
  maintenance: 'badge-red', cleaning: 'badge-yellow',
}

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, room_type:room_types(name, capacity)')
    .eq('hotel_id', tenantId)
    .order('room_number')

  const available = rooms?.filter(r => r.status === 'available').length ?? 0
  const booked = rooms?.filter(r => r.status === 'booked').length ?? 0
  const maintenance = rooms?.filter(r => r.status === 'maintenance').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
          <p className="text-gray-500 text-sm mt-1">{rooms?.length ?? 0} total rooms</p>
        </div>
        <Link href="/hotel-admin/rooms/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Room
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available', count: available, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Occupied', count: booked, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Maintenance', count: maintenance, color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
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
                    <BedDouble className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Room {room.room_number}</span>
                  </div>
                </td>
                <td className="table-cell text-gray-500">{(room.room_type as { name?: string })?.name}</td>
                <td className="table-cell text-gray-500">Floor {room.floor}</td>
                <td className="table-cell text-gray-500">{(room.room_type as { capacity?: number })?.capacity} guests</td>
                <td className="table-cell font-medium">${room.price_per_night}</td>
                <td className="table-cell">
                  <span className={statusBadge[room.status] ?? 'badge-gray'}>
                    {room.status}
                  </span>
                </td>
                <td className="table-cell">
                  <RoomStatusToggle roomId={room.id} currentStatus={room.status} />
                </td>
              </tr>
            ))}
            {!rooms?.length && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No rooms yet. Add your first room.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
