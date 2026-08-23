import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Building2, Users, CreditCard, TrendingUp, Hotel, AlertCircle, Clock, CheckCircle2, Gift, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Super Admin Dashboard' }

export default async function SuperAdminDashboard() {
  const supabase  = await createClient()
  const admin     = await createAdminClient()

  const [
    { data: hotels },
    { count: totalUsers },
    { data: recentHotels },
    { data: activeSubHotels },
  ] = await Promise.all([
    admin.from('hotels').select('id, status'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'super_admin'),
    admin.from('hotels')
      .select('id, name, status, created_at, plan:plans(name)')
      .order('created_at', { ascending: false })
      .limit(6),
    admin.from('hotels')
      .select('billing_cycle, subscription_status, plan:plans(price_monthly, price_yearly)')
      .eq('subscription_status', 'active'),
  ])

  const statuses     = (hotels ?? []) as { id: string; status: string }[]
  const totalHotels  = statuses.length
  const activeHotels = statuses.filter(h => h.status === 'active').length
  const suspended    = statuses.filter(h => h.status === 'suspended').length
  const pending      = statuses.filter(h => h.status === 'pending').length

  // MRR from active subscriptions
  const mrr = (activeSubHotels ?? []).reduce((sum, h) => {
    const p = (h.plan as unknown) as { price_monthly: number; price_yearly: number } | null
    if (!p) return sum
    return sum + (h.billing_cycle === 'yearly' ? p.price_yearly / 12 : p.price_monthly)
  }, 0)

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const kpis = [
    { title: 'Total Hotels',  value: totalHotels,        icon: Hotel,        bg: 'bg-blue-50',    color: 'text-blue-600'   },
    { title: 'Active Hotels', value: activeHotels,       icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600'},
    { title: 'Pending',       value: pending,            icon: Clock,        bg: pending > 0 ? 'bg-amber-50'  : 'bg-gray-50', color: pending > 0 ? 'text-amber-600'  : 'text-gray-400' },
    { title: 'Suspended',     value: suspended,          icon: AlertCircle,  bg: suspended > 0 ? 'bg-red-50'  : 'bg-gray-50', color: suspended > 0 ? 'text-red-600'  : 'text-gray-400' },
    { title: 'Total Users',   value: totalUsers ?? 0,   icon: Users,        bg: 'bg-purple-50',  color: 'text-purple-600' },
    { title: 'MRR',           value: usd(mrr),           icon: TrendingUp,   bg: 'bg-indigo-50',  color: 'text-indigo-600', href: '/super-admin/billing' },
  ]

  const statusBadgeCls: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700',
    suspended: 'bg-rose-100 text-rose-700',
    pending:   'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Monitor all hotels and platform activity</p>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          const card = (
            <div className={`rounded-2xl border bg-white p-5 h-full ${k.title === 'Pending' && pending > 0 ? 'border-amber-200' : k.title === 'Suspended' && suspended > 0 ? 'border-red-200' : 'border-gray-100'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.bg}`}>
                <Icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <p className="text-2xl font-black text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500 mt-1">{k.title}</p>
            </div>
          )
          return k.href
            ? <Link key={k.title} href={k.href} className="hover:scale-[1.02] transition-transform">{card}</Link>
            : <div key={k.title}>{card}</div>
        })}
      </div>

      {/* ── Pending alert ── */}
      {pending > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium flex-1">
            <span className="font-bold">{pending} hotel{pending !== 1 ? 's' : ''}</span> pending approval — review and activate them so owners can start using their dashboard.
          </p>
          <Link href="/super-admin/hotels?status=pending" className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors shrink-0">
            Review <ArrowRight className="inline h-3 w-3 ml-0.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hotels */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Hotels</h3>
            <Link href="/super-admin/hotels" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentHotels?.map(hotel => (
              <Link
                key={hotel.id}
                href={`/super-admin/hotels/${hotel.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{hotel.name}</p>
                  <p className="text-xs text-gray-400">{new Date(hotel.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{(hotel.plan as { name?: string } | null)?.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadgeCls[hotel.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {hotel.status}
                  </span>
                </div>
              </Link>
            ))}
            {!recentHotels?.length && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No hotels yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2.5">
            {[
              { href: '/super-admin/hotels/new', icon: Building2, label: 'Create New Hotel',  primary: true  },
              { href: '/super-admin/billing',    icon: TrendingUp, label: 'Billing Dashboard', primary: false },
              { href: '/super-admin/plans',      icon: CreditCard, label: 'Manage Plans',      primary: false },
              { href: '/super-admin/users',      icon: Users,      label: 'Manage Users',      primary: false },
            ].map(({ href, icon: Icon, label, primary }) => (
              <Link
                key={href}
                href={href}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  primary
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>

          <div className="mt-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-900">Revenue snapshot</span>
            </div>
            <p className="text-xs text-indigo-700">
              <span className="font-bold">{usd(mrr)}</span> MRR · <span className="font-bold">{usd(mrr * 12)}</span> ARR from {activeSubHotels?.length ?? 0} active subscription{(activeSubHotels?.length ?? 0) !== 1 ? 's' : ''}
            </p>
            <Link href="/super-admin/billing" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700">
              Full billing dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
