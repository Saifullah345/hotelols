import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'
import { User, UserPlus } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Users' }

const roleBadge: Record<UserRole, string> = {
  super_admin: 'badge-red',
  hotel_admin: 'badge-blue',
  staff: 'badge-yellow',
  customer: 'badge-gray',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, tenant_id')
    .order('created_at', { ascending: false })

  const tenantIds = Array.from(
    new Set((users ?? []).map(user => user.tenant_id).filter(Boolean) as string[])
  )

  const hotelNameById = new Map<string, string>()
  if (tenantIds.length > 0) {
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id, name')
      .in('id', tenantIds)

    for (const hotel of hotels ?? []) {
      hotelNameById.set(hotel.id, hotel.name)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Users</h2>
          <p className="text-gray-500 text-sm mt-1">{users?.length ?? 0} Registered users</p>
        </div>
        <Link href="/super-admin/users/add" className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4" /> Add User
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">User</th>
              <th className="table-header">Role</th>
              <th className="table-header">Hotel</th>
              <th className="table-header">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">
                      {user.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <span className={roleBadge[user.role as UserRole] ?? 'badge-gray'}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {user.tenant_id ? (hotelNameById.get(user.tenant_id) ?? '—') : '—'}
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
