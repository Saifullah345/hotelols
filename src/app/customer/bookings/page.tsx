import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin } from 'lucide-react'

export const metadata = { title: 'My Bookings' }

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

export default async function CustomerBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, hotel:hotels(name, city, country), room:rooms(room_number, room_type:room_types(name)), payment:payments(status, amount, payment_method)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
        <p className="text-gray-500 text-sm mt-1">{bookings?.length ?? 0} total bookings</p>
      </div>

      <div className="space-y-4">
        {bookings?.map(b => (
          <div key={b.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{(b.hotel as { name?: string })?.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {(b.hotel as { city?: string })?.city}, {(b.hotel as { country?: string })?.country}
                </p>
              </div>
              <span className={statusBadge[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Room</p>
                <p className="font-medium">
                  {(b.room as { room_number?: string })?.room_number} —{' '}
                  {((b.room as { room_type?: { name?: string } })?.room_type)?.name}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Check-in</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(b.check_in).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Check-out</p>
                <p className="font-medium">{new Date(b.check_out).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Total</p>
                <p className="font-bold text-primary-700">${b.total_amount}</p>
              </div>
            </div>

            {b.payment && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
                <span className="text-gray-500">Payment:</span>
                <span className={`badge-${(b.payment as { status?: string })?.status === 'completed' ? 'green' : 'yellow'}`}>
                  {(b.payment as { status?: string })?.status}
                </span>
                <span className="text-gray-400 capitalize">· {(b.payment as { payment_method?: string })?.payment_method}</span>
              </div>
            )}
          </div>
        ))}
        {!bookings?.length && (
          <div className="card p-12 text-center">
            <p className="text-lg font-medium text-gray-700 mb-2">No bookings yet</p>
            <p className="text-gray-500 text-sm">Find a hotel and make your first booking!</p>
          </div>
        )}
      </div>
    </div>
  )
}
