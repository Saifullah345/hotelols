import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Users, UserCheck, UserX } from 'lucide-react'
import AutoFilterForm from '@/components/ui/AutoFilterForm'
import { DEPARTMENTS } from '@/lib/staff-constants'
import StaffClient, { type StaffMember } from './StaffClient'

export const metadata = { title: 'Staff Management' }

// Edits, removals and newly invited members must show on the next render.
export const dynamic = 'force-dynamic'

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
    .select('id, user_id, department, position, permissions, is_active, user:profiles(full_name, email, phone)')
    .eq('hotel_id', tenantId)
    // Newest member first.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

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

  const totalCount  = staff?.length ?? 0
  const activeCount = staff?.filter(s => s.is_active).length ?? 0
  const inactiveCount = totalCount - activeCount

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">Staff Management</h2>
            <p className="text-indigo-300 text-sm mt-0.5">{totalCount} total members</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Users className="h-4 w-4 text-indigo-300" />
              <div>
                <p className="text-white font-bold leading-none">{totalCount}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{activeCount}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <UserX className="h-4 w-4 text-rose-400" />
              <div>
                <p className="text-white font-bold leading-none">{inactiveCount}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Inactive</p>
              </div>
            </div>
            <Link href="/hotel-admin/staff/invite" className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Invite Staff
            </Link>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <AutoFilterForm className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select
          name="department"
          defaultValue={department ?? ''}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilter && (
          <Link href="/hotel-admin/staff" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <StaffClient staff={(filtered ?? []) as unknown as StaffMember[]} />
    </div>
  )
}
