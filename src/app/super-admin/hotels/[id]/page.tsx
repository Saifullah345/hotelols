import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Mail, Phone, BedDouble, CalendarCheck, DollarSign, User } from 'lucide-react'

export const metadata = { title: 'Hotel Details' }

const statusBadge: Record<string, string> = {
  active: 'badge-green', suspended: 'badge-red', pending: 'badge-yellow',
}
const bookingBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

export default async function HotelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, plan:plans(name, price_monthly), owner:profiles(full_name, email)')
    .eq('id', id)
    .single()

  if (!hotel) notFound()

  const [{ data: rooms }, { data: bookings }, { data: payments }] = await Promise.all([
    supabase.from('rooms').select('id, status').eq('hotel_id', id),
    supabase
      .from('bookings')
      .select('id, status, total_amount, check_in, check_out, created_at, guest_name, user:profiles(full_name, email)')
      .eq('hotel_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('payments').select('amount, status').eq('hotel_id', id),
  ])

  const roomCount = rooms?.length ?? 0
  const availableRooms = rooms?.filter(r => r.status === 'available').length ?? 0
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', id)
  const revenue = (payments ?? [])
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const owner = hotel.owner as { full_name?: string; email?: string } | null
  const plan = hotel.plan as { name?: string; price_monthly?: number } | null

  const stats = [
    { label: 'Rooms', value: roomCount, sub: `${availableRooms} available`, icon: BedDouble, color: 'text-blue-600 bg-blue-50' },
    { label: 'Bookings', value: bookingCount ?? 0, sub: 'all time', icon: CalendarCheck, color: 'text-purple-600 bg-purple-50' },
    { label: 'Revenue', value: `$${revenue.toLocaleString()}`, sub: 'completed payments', icon: DollarSign, color: 'text-green-600 bg-green-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/hotels" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary-50 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{hotel.name}</h2>
              <span className={statusBadge[hotel.status] ?? 'badge-gray'}>{hotel.status}</span>
            </div>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <MapPin className="h-3 w-3" />{[hotel.city, hotel.country].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label} · {s.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Hotel Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400" />{hotel.email || '—'}</div>
            <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400" />{hotel.phone || '—'}</div>
            <div className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400" />{hotel.address || '—'}</div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="text-gray-500">Plan</span>
              <span className="badge-blue capitalize">{plan?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-in / Check-out</span>
              <span className="text-gray-900">{hotel.check_in_time} · {hotel.check_out_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">{new Date(hotel.created_at).toLocaleDateString()}</span>
            </div>
          </dl>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Owner</h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
              {owner?.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-medium text-gray-900">{owner?.full_name ?? '—'}</p>
              <p className="text-sm text-gray-500">{owner?.email ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Guest</th>
              <th className="table-header">Check-in</th>
              <th className="table-header">Check-out</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings?.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">
                  {(b.user as { full_name?: string } | null)?.full_name
                    || b.guest_name
                    || (b.user as { email?: string } | null)?.email
                    || '—'}
                </td>
                <td className="table-cell text-gray-500">{new Date(b.check_in).toLocaleDateString()}</td>
                <td className="table-cell text-gray-500">{new Date(b.check_out).toLocaleDateString()}</td>
                <td className="table-cell font-semibold">${b.total_amount}</td>
                <td className="table-cell">
                  <span className={bookingBadge[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
                </td>
              </tr>
            ))}
            {!bookings?.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No bookings yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
