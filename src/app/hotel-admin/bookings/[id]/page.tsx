import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, BedDouble, Calendar, Moon,
  Users, DoorOpen, Phone, MessageCircle, Globe,
  MessageSquare, BadgeCheck, Clock, CreditCard,
} from 'lucide-react'
import BookingActions from '../BookingActions'
import { formatCurrency } from '@/lib/currency'

type Ctx = { params: Promise<{ id: string }> }

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Pending',      cls: 'bg-amber-50  text-amber-700  border-amber-200'    },
  confirmed:   { label: 'Confirmed',    cls: 'bg-blue-50   text-blue-700   border-blue-200'     },
  checked_in:  { label: 'Checked In',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
  checked_out: { label: 'Checked Out',  cls: 'bg-gray-100  text-gray-600   border-gray-200'    },
  cancelled:   { label: 'Cancelled',    cls: 'bg-red-50    text-red-700    border-red-200'      },
}

const sourceConfig: Record<string, { label: string; Icon: typeof DoorOpen }> = {
  walk_in:  { label: 'Walk-in',  Icon: DoorOpen      },
  phone:    { label: 'Phone',    Icon: Phone         },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle },
  online:   { label: 'Online',   Icon: Globe         },
}

const avatarColor = (name: string) => {
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']
  return colors[(name.charCodeAt(0) ?? 0) % colors.length]
}

const nights = (ci: string, co: string) =>
  Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default async function ViewBookingPage({ params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) redirect('/login')

  const [{ data: booking }, { data: hotel }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        *,
        user:profiles(full_name, email, phone),
        room:rooms(id, room_number, name, floor, price_per_night, images, room_type:room_types(name))
      `)
      .eq('id', id)
      .eq('hotel_id', profile.tenant_id)
      .single(),
    supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
  ])

  if (!booking) notFound()

  const currency  = (hotel as { currency?: string } | null)?.currency ?? 'USD'
  const n         = nights(booking.check_in, booking.check_out)
  const guest     = booking.user?.full_name ?? booking.guest_name ?? 'Guest'
  const contact   = booking.user?.email ?? booking.guest_phone ?? ''
  const statusCfg = statusConfig[booking.status] ?? statusConfig.pending
  const srcCfg    = sourceConfig[booking.source ?? 'walk_in'] ?? sourceConfig.walk_in
  const SrcIcon   = srcCfg.Icon

  type RoomDetail = { id: string; room_number: string; name: string | null; floor: number; price_per_night: number; images: string[] | null; room_type: { name?: string } | null }
  const primaryRoom = booking.room as RoomDetail | null
  const coverImg    = primaryRoom?.images?.[0] ?? null

  // Fetch additional rooms for multi-room bookings
  const allRoomIds: string[] = (booking.room_ids as string[] | null) ?? (primaryRoom ? [primaryRoom.id] : [])
  let extraRooms: RoomDetail[] = []
  if (allRoomIds.length > 1 && primaryRoom) {
    const extraIds = allRoomIds.filter(rid => rid !== primaryRoom.id)
    const { data: extraData } = await supabase
      .from('rooms')
      .select('id, room_number, name, floor, price_per_night, images, room_type:room_types(name)')
      .in('id', extraIds)
    if (extraData) extraRooms = extraData as RoomDetail[]
  }
  const allRooms: RoomDetail[] = primaryRoom ? [primaryRoom, ...extraRooms] : []

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hotel-admin/bookings" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Booking Detail</h2>
            <p className="text-sm text-gray-400 mt-0.5">#{id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookingActions bookingId={booking.id} currentStatus={booking.status} />
          <Link
            href={`/hotel-admin/bookings/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* Guest + Status hero card */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${avatarColor(guest)}`}>
          {guest.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900">{guest}</h3>
          {contact && <p className="text-sm text-gray-500 mt-0.5">{contact}</p>}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusCfg.cls}`}>
          <BadgeCheck className="h-4 w-4" />
          {statusCfg.label}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: CreditCard,
            label: 'Total Amount',
            value: formatCurrency(booking.total_amount, currency),
            color: 'text-blue-600 bg-blue-50',
          },
          {
            icon: Moon,
            label: 'Nights',
            value: `${n} night${n !== 1 ? 's' : ''}`,
            color: 'text-violet-600 bg-violet-50',
          },
          {
            icon: Users,
            label: 'Guests',
            value: `${booking.adults + booking.children} (${booking.adults}A${booking.children ? ` · ${booking.children}C` : ''})`,
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            icon: SrcIcon,
            label: 'Source',
            value: srcCfg.label,
            color: 'text-orange-600 bg-orange-50',
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Room(s) + Stay */}
      <div className={`grid gap-4 ${allRooms.length > 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>

        {/* Rooms */}
        {allRooms.length > 1 ? (
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{allRooms.length} Rooms</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allRooms.map(r => (
                <div key={r.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {r.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.images[0]} alt="" className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <BedDouble className="h-7 w-7 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{r.name ?? `Room ${r.room_number}`}</p>
                      {r.room_type?.name && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 shrink-0">
                          {r.room_type.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">#{r.room_number} · {r.floor === 0 ? 'Ground' : `Floor ${r.floor}`}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{formatCurrency(r.price_per_night, currency)}<span className="text-gray-400 font-normal">/night</span></span>
                      <Link href={`/hotel-admin/rooms/${r.id}`} className="text-primary-600 hover:text-primary-700 font-medium">View →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {coverImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImg} alt="" className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <BedDouble className="h-10 w-10 text-gray-300" />
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{primaryRoom?.name ?? `Room ${primaryRoom?.room_number}`}</p>
                  <p className="text-xs text-gray-400">#{primaryRoom?.room_number}</p>
                </div>
                {primaryRoom?.room_type?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                    {primaryRoom.room_type.name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {primaryRoom?.floor === 0 ? 'Ground floor' : `Floor ${primaryRoom?.floor}`}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(primaryRoom?.price_per_night ?? 0, currency)}<span className="text-gray-400 font-normal">/night</span>
                </span>
              </div>
              {primaryRoom && (
                <Link
                  href={`/hotel-admin/rooms/${primaryRoom.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium mt-1"
                >
                  View room →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stay */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Check-in</p>
                <p className="text-sm font-semibold text-gray-900">{fmtDate(booking.check_in)}</p>
              </div>
            </div>

            <div className="ml-4 border-l-2 border-dashed border-gray-200 pl-4 py-1">
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Moon className="h-3 w-3" /> {n} night{n !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Check-out</p>
                <p className="text-sm font-semibold text-gray-900">{fmtDate(booking.check_out)}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {allRooms.length > 1
                  ? `${n} nights · ${allRooms.length} rooms`
                  : `${n} × ${formatCurrency(primaryRoom?.price_per_night ?? 0, currency)}`}
              </span>
              <span className="font-bold text-gray-900">{formatCurrency(booking.total_amount, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Special Requests */}
      {booking.special_requests && (
        <div className="card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <MessageSquare className="h-3.5 w-3.5" />
            Special Requests
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{booking.special_requests}</p>
        </div>
      )}

      {/* Meta */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Booking Info</p>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Booking ID</p>
            <p className="font-mono text-gray-700 text-xs mt-0.5">{booking.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Created</p>
            <p className="text-gray-700 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              {booking.created_at
                ? new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
