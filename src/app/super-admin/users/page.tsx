import { createAdminClient, createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types'
import { User, UserPlus, ChevronLeft, ChevronRight, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import VerifyUserButton from '@/components/admin/VerifyUserButton'
import SuspendUserButton from '@/components/admin/SuspendUserButton'
import LinkUserHotelControl from '@/components/admin/LinkUserHotelControl'
import AutoFilterForm from '@/components/ui/AutoFilterForm'

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
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page, q } = await searchParams
  const supabase = await createClient()
  const admin = await createAdminClient()
  const pageSize = 10
  const currentPage = Math.max(1, parseInt(page ?? '1'))

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at, tenant_id, city, country')
    .order('created_at', { ascending: false })

  const query = q?.trim().toLowerCase()
  const users = query
    ? (allUsers ?? []).filter(user =>
        user.full_name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
      )
    : allUsers

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
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name')
    .order('name')

  if (tenantIds.length > 0) {
    for (const hotel of hotels?.filter(hotel => tenantIds.includes(hotel.id)) ?? []) {
      hotelNameById.set(hotel.id, hotel.name)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Users</h2>
            <p className="text-gray-500 text-sm mt-1">{totalUsers} Registered users</p>
          </div>
        </div>
        <Link href="/super-admin/users/add" className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4" /> Add User
        </Link>
      </div>

      <AutoFilterForm className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {q && (
          <Link href="/super-admin/users" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
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
                    {user.role !== 'super_admin' && (
                      <LinkUserHotelControl userId={user.id} hotelId={user.tenant_id} hotels={hotels ?? []} />
                    )}
                    <VerifyUserButton userId={user.id} isVerified={confirmedById.get(user.id) ?? false} />
                    <SuspendUserButton userId={user.id} suspended={suspendedById.get(user.id) ?? false} />
                  </div>
                </td>
              </tr>
            ))}
            {!paginatedUsers?.length && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No users match your search</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Page {currentPage} of {totalPages || 1} • Showing {paginatedUsers?.length ?? 0} of {totalUsers} users
        </p>
        <div className="flex gap-2">
          <Link
            href={`/super-admin/users?page=${currentPage - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`btn-secondary inline-flex items-center gap-2 text-sm ${
              currentPage <= 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
          <Link
            href={`/super-admin/users?page=${currentPage + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
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
