import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Building2, MapPin, Users } from 'lucide-react'
import HotelActions from './HotelActions'

export const metadata = { title: 'Hotels' }

export default async function HotelsPage() {
  const supabase = await createClient()
  const { data: hotels } = await supabase
    .from('hotels')
    .select('*, plan:plans(name, price_monthly), owner:profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hotels</h2>
          <p className="text-gray-500 text-sm mt-1">{hotels?.length ?? 0} hotels registered</p>
        </div>
        <Link href="/super-admin/hotels/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Hotel
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Hotel</th>
              <th className="table-header">Owner</th>
              <th className="table-header">Plan</th>
              <th className="table-header">Status</th>
              <th className="table-header">Created</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hotels?.map(hotel => (
              <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{hotel.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{hotel.city}, {hotel.country}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <p className="text-sm text-gray-900">{(hotel.owner as { full_name?: string })?.full_name}</p>
                  <p className="text-xs text-gray-500">{(hotel.owner as { email?: string })?.email}</p>
                </td>
                <td className="table-cell">
                  <span className="badge-blue capitalize">{(hotel.plan as { name?: string })?.name}</span>
                </td>
                <td className="table-cell">
                  <span className={`badge-${hotel.status === 'active' ? 'green' : hotel.status === 'suspended' ? 'red' : 'yellow'}`}>
                    {hotel.status}
                  </span>
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {new Date(hotel.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <HotelActions hotelId={hotel.id} currentStatus={hotel.status} />
                </td>
              </tr>
            ))}
            {!hotels?.length && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No hotels yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
