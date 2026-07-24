import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, BedDouble, DollarSign,
  Users, Hash, Layers, Star, FileText, Tag,
} from 'lucide-react'
import { ImageSlider } from './ImageSlider'
import { formatCurrency } from '@/lib/currency'

const statusStyle: Record<string, { badge: string; dot: string }> = {
  available:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  booked:      { badge: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400'    },
  maintenance: { badge: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-400'     },
  cleaning:    { badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400'   },
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: room } = await supabase.from('rooms').select('name, room_number').eq('id', id).single()
  return { title: room ? `${room.name ?? `Room ${room.room_number}`}` : 'Room' }
}

export default async function ViewRoomPage({
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

  const { data: room } = await supabase
    .from('rooms')
    .select('*, room_type:room_types(name)')
    .eq('id', id)
    .single()

  if (!room) notFound()
  if (profile.role !== 'super_admin' && room.hotel_id !== profile.tenant_id) notFound()

  const { data: hotel } = await supabase
    .from('hotels').select('currency').eq('id', room.hotel_id).single()
  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'

  const images: string[]    = room.images   ?? []
  const amenities: string[] = room.amenities ?? []
  const st = statusStyle[room.status] ?? statusStyle.available
  const roomType = (room.room_type as { name?: string } | null)?.name ?? '—'

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {room.name ?? `Room ${room.room_number}`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              #{room.room_number} · {roomType} · {room.floor === 0 ? 'Ground Floor' : `Floor ${room.floor}`}
            </p>
          </div>
        </div>
        <Link
          href={`/hotel-admin/rooms/${room.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex-shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit Room
        </Link>
      </div>

      {/* Image slider */}
      <ImageSlider images={images} />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Status */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${st.badge}`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Status</p>
            <p className="text-sm font-bold capitalize">{room.status}</p>
          </div>
        </div>

        {/* Price */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Per Night</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(room.price_per_night, currency)}</p>
          </div>
        </div>

        {/* Capacity */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Capacity</p>
            <p className="text-sm font-bold text-gray-900">{room.capacity} guest{room.capacity !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Type */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Tag className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Type</p>
            <p className="text-sm font-bold text-gray-900 truncate">{roomType}</p>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="card divide-y divide-gray-100 overflow-hidden">

        {/* Room info */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Room Info</p>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Hash className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Room Number</p>
                <p className="text-sm font-semibold text-gray-800">{room.room_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Layers className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Floor</p>
                <p className="text-sm font-semibold text-gray-800">
                  {room.floor === 0 ? 'Ground' : `Floor ${room.floor}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <BedDouble className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Display Name</p>
                <p className="text-sm font-semibold text-gray-800">{room.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Occupancy</p>
                <p className="text-sm font-semibold text-gray-800">
                  {room.max_adults} adult{room.max_adults !== 1 ? 's' : ''}
                  {room.max_children > 0 ? ` · ${room.max_children} child${room.max_children !== 1 ? 'ren' : ''}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Amenities
            {amenities.length > 0 && (
              <span className="ml-2 text-blue-600 normal-case font-medium">{amenities.length} features</span>
            )}
          </p>
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-700 font-medium"
                >
                  <Star className="h-3 w-3 text-amber-400" />
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No amenities listed.</p>
          )}
        </div>

        {/* Notes */}
        {room.notes && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{room.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
