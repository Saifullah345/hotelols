import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, UserCheck, UserMinus } from 'lucide-react'
import AutoFilterForm from '@/components/ui/AutoFilterForm'
import { DEPARTMENTS } from '@/lib/staff-constants'
import StaffClient, { type StaffMember } from './StaffClient'

export const metadata = { title: 'Staff Management' }

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

  const { data: hotelPlan } = await supabase
    .from('hotels').select('plan:plans(max_staff, name)').eq('id', tenantId).single()
  const planMaxStaff = (hotelPlan?.plan as { max_staff?: number } | null)?.max_staff ?? -1
  const planName     = (hotelPlan?.plan as { name?: string }      | null)?.name ?? ''

  let query = supabase
    .from('staff')
    .select('id, user_id, name, email, phone, department, position, is_active, status, shift, salary, user:profiles(full_name, email, phone)')
    .eq('hotel_id', tenantId)
    // Newest member first.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (department) query = query.eq('department', department)
  if (status === 'active')   query = query.eq('status', 'active')
  if (status === 'on_leave') query = query.eq('status', 'on_leave')
  if (status === 'inactive') query = query.eq('status', 'inactive')

  const { data: staff } = await query

  const filtered = q
    ? staff?.filter(s => {
        const u = s.user as { full_name?: string; email?: string } | null
        const qLow = q.toLowerCase()
        return (
          s.name?.toLowerCase().includes(qLow) ||
          s.email?.toLowerCase().includes(qLow) ||
          u?.full_name?.toLowerCase().includes(qLow) ||
          u?.email?.toLowerCase().includes(qLow)
        )
      })
    : staff

  const hasFilter = !!(department || status || q)

  const totalCount   = staff?.length ?? 0
  const activeCount  = staff?.filter(s => (s.status ?? (s.is_active ? 'active' : 'inactive')) === 'active').length ?? 0
  const onLeaveCount = staff?.filter(s => s.status === 'on_leave').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-primary-500/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">Team Members</h2>
            <p className="text-primary-300 text-sm mt-0.5">
              {totalCount} staff Â· {activeCount} on duty
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Users className="h-4 w-4 text-primary-300" />
              <div>
                <p className="text-white font-bold leading-none">{totalCount}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{activeCount}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <UserMinus className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-white font-bold leading-none">{onLeaveCount}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">On Leave</p>
              </div>
            </div>
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
            placeholder="Search by name or emailâ€¦"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <select
          name="department"
          defaultValue={department ?? ''}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilter && (
          <Link href="/hotel-admin/staff" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <StaffClient
        staff={(filtered ?? []) as unknown as StaffMember[]}
        planMaxStaff={planMaxStaff}
        planName={planName}
        totalActiveStaff={activeCount}
      />
    </div>
  )
}