import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Rooms' }

const statusBadge: Record<string, string> = {
  available: 'badge-green',
  occupied: 'badge-blue',
  maintenance: 'badge-red',
  cleaning: 'badge-yellow',
}

export default async function StaffRoomsPage({
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
    .from('rooms')
    .select('*, room_type:room_types(name)')
    .eq('hotel_id', tenantId)
    .order('room_number')

  if (status) query = query.eq('status', status)

  const { data: rooms } = await query

  const filterTabs = ['all', 'available', 'occupied', 'maintenance', 'cleaning']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
        <p className="text-gray-500 text-sm mt-1">{rooms?.length ?? 0} rooms</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map(tab => (
          <Link
            key={tab}
            href={tab === 'all' ? '/staff/rooms' : `/staff/rooms?status=${tab}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              (tab === 'all' && !status) || status === tab
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms?.map(room => (
          <div key={room.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900 text-lg">Room {room.room_number}{room.name && ` — ${room.name}`}</p>
                <p className="text-sm text-gray-500">{(room.room_type as { name?: string })?.name}</p>
              </div>
              <span className={statusBadge[room.status] ?? 'badge-gray'}>{room.status}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Floor {room.floor ?? '—'}</span>
              <span>Up to {room.capacity ?? '—'} guests</span>
            </div>
          </div>
        ))}
        {!rooms?.length && (
          <div className="col-span-full py-12 text-center text-gray-500">No rooms found</div>
        )}
      </div>
    </div>
  )
}
