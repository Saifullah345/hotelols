import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, User } from 'lucide-react'

export const metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('*, user:profiles(full_name, email, phone)')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 text-sm mt-1">{staff?.length ?? 0} staff members</p>
        </div>
        <Link href="/hotel-admin/staff/invite" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Invite Staff
        </Link>
      </div>

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
            {staff?.map(s => (
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
            {!staff?.length && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No staff members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
