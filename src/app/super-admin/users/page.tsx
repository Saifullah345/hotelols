import { createAdminClient, createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'
import { User, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import VerifyUserButton from '@/components/admin/VerifyUserButton'
import SuspendUserButton from '@/components/admin/SuspendUserButton'

export const metadata = { title: 'Users' }

const roleBadge: Record<UserRole, string> = {
  super_admin: 'badge-red',
  hotel_admin: 'badge-blue',
  staff: 'badge-yellow',
  customer: 'badge-gray',
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const supabase = await createClient()
  const admin = await createAdminClient()
  const pageSize = 10
  const currentPage = Math.max(1, parseInt(page ?? '1'))

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, tenant_id, city, country')
    .order('created_at', { ascending: false })

  const totalUsers = users?.length ?? 0
  const totalPages = Math.ceil(totalUsers / pageSize)
  const paginatedUsers = (users ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const { data: authList, error: authListError } = await admin.auth.admin.listUsers({ perPage: 1000 })

  const confirmedById = new Map<string, boolean>(
    (authList?.users ?? []).map(user => [user.id, Boolean(user.email_confirmed_at)])
  )

  const suspendedById = new Map<string, boolean>(
    (authList?.users ?? []).map(user => [user.id, Boolean(user.banned_until)])
  )

  if (authListError) {
    console.error('Failed to load auth users for verification status', authListError)
  }

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
          <p className="text-gray-500 text-sm mt-1">{totalUsers} Registered users</p>
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
              <th className="table-header">Verified</th>
              <th className="table-header">Joined</th>
              <th className="table-header">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers?.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">
                      {user.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {(user.city || user.country) && (
                        <p className="text-xs text-gray-400">{[user.city, user.country].filter(Boolean).join(', ')}</p>
                      )}
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
                <td className="table-cell">
                  {confirmedById.get(user.id) ? (
                    <span className="badge-green">Verified</span>
                  ) : (
                    <span className="badge-yellow">Unverified</span>
                  )}
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <VerifyUserButton userId={user.id} isVerified={confirmedById.get(user.id) ?? false} />
                    <SuspendUserButton userId={user.id} suspended={suspendedById.get(user.id) ?? false} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Page {currentPage} of {totalPages || 1} • Showing {paginatedUsers?.length ?? 0} of {totalUsers} users
        </p>
        <div className="flex gap-2">
          <Link
            href={`/super-admin/users?page=${currentPage - 1}`}
            className={`btn-secondary inline-flex items-center gap-2 text-sm ${
              currentPage <= 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
          <Link
            href={`/super-admin/users?page=${currentPage + 1}`}
            className={`btn-secondary inline-flex items-center gap-2 text-sm ${
              currentPage >= totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
