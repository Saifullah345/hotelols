import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditRoomForm from './EditRoomForm'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Edit Room · ${id.slice(0, 8)}` }
}

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role)) redirect('/login')

  // Load room
  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_number, floor, price_per_night, room_type_id, status, notes, hotel_id')
    .eq('id', id)
    .single()

  if (!room) notFound()
  if (profile.role !== 'super_admin' && room.hotel_id !== profile.tenant_id) notFound()

  // Load room types for this hotel
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name, capacity')
    .eq('hotel_id', room.hotel_id)
    .order('name')

  // Hotel currency
  const { data: hotel } = await supabase
    .from('hotels').select('currency').eq('id', room.hotel_id).single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  // Booking impact counts — used to show smart warnings
  const today = new Date().toISOString().slice(0, 10)

  const { count: activeBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)
    .eq('status', 'checked_in')

  const { count: upcomingBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)
    .in('status', ['confirmed', 'pending'])
    .gte('check_in', today)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Room {room.room_number}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update room details, pricing, or type</p>
        </div>
      </div>

      <EditRoomForm
        room={room}
        roomTypes={roomTypes ?? []}
        currency={currency}
        activeBookings={activeBookings ?? 0}
        upcomingBookings={upcomingBookings ?? 0}
      />
    </div>
  )
}
