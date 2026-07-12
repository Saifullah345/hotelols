import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, User, Search } from 'lucide-react'
import AutoFilterForm from '@/components/ui/AutoFilterForm'

export const metadata = { title: 'Staff Management' }

const DEPARTMENTS = ['Front Desk', 'Housekeeping', 'Management', 'Security', 'Kitchen', 'Maintenance']

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; status?: string; q?: string }>
}) {
  const { department, status, q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  let query = supabase
    .from('staff')
    .select('*, user:profiles(full_name, email, phone)')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  if (department) query = query.eq('department', department)
  if (status === 'active')   query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data: staff } = await query

  const filtered = q
    ? staff?.filter(s =>
        (s.user as { full_name?: string })?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        (s.user as { email?: string })?.email?.toLowerCase().includes(q.toLowerCase())
      )
    : staff

  const hasFilter = !!(department || status || q)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 text-sm mt-1">{filtered?.length ?? 0} staff members</p>
        </div>
        <Link href="/hotel-admin/staff/invite" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Invite Staff
        </Link>
      </div>

      {/* Filter bar */}
      <AutoFilterForm className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          name="department"
          defaultValue={department ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilter && (
          <Link href="/hotel-admin/staff" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Member</th>
              <th className="table-header">Department</th>
              <th className="table-header">Position</th>
              <th className="table-header">Permissions</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">
                      {(s.user as { full_name?: string })?.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{(s.user as { full_name?: string })?.full_name}</p>
                      <p className="text-xs text-gray-500">{(s.user as { email?: string })?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-gray-500">{s.department}</td>
                <td className="table-cell text-gray-500">{s.position}</td>
                <td className="table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {(s.permissions as string[]).slice(0, 2).map((p: string) => (
                      <span key={p} className="badge-gray text-xs">{p}</span>
                    ))}
                    {(s.permissions as string[]).length > 2 && (
                      <span className="badge-gray text-xs">+{(s.permissions as string[]).length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {!filtered?.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No staff match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
