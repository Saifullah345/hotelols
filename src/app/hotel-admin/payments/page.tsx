import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, CheckCircle, XCircle, Clock, Search } from 'lucide-react'
import AutoFilterForm from '@/components/ui/AutoFilterForm'

export const metadata = { title: 'Payments' }

const statusIcon = { completed: CheckCircle, failed: XCircle, pending: Clock, refunded: XCircle }
const statusBadge: Record<string, string> = {
  completed: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', refunded: 'badge-gray'
}

const STATUSES = ['completed', 'pending', 'failed', 'refunded']
const METHODS  = ['cash', 'card', 'stripe', 'bank_transfer']

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; status?: string; method?: string; q?: string }>
}) {
  const { ok, error, status, method, q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  let query = supabase
    .from('payments')
    .select('*, booking:bookings(check_in, check_out, room:rooms(room_number)), user:profiles(full_name)')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (method) query = query.eq('payment_method', method)
  if (q)      query = query.ilike('invoice_number', `%${q}%`)

  const { data: payments } = await query

  const { data: allPayments } = await supabase
    .from('payments').select('status, amount').eq('hotel_id', tenantId)

  const totalRevenue  = allPayments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0
  const pendingAmount = allPayments?.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0) ?? 0

  const hasFilter = !!(status || method || q)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
        <p className="text-gray-500 text-sm mt-1">{payments?.length ?? 0} transactions shown</p>
      </div>

      {ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Payment marked as <span className="font-semibold">{ok}</span>.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-700 mt-1">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">${pendingAmount.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{allPayments?.length ?? 0}</p>
        </div>
      </div>

      {/* Filter bar */}
      <AutoFilterForm className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search invoice number…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          name="method"
          defaultValue={method ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Methods</option>
          {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        {hasFilter && (
          <Link href="/hotel-admin/payments" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-header">Invoice</th>
              <th className="table-header">Guest</th>
              <th className="table-header">Room</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Method</th>
              <th className="table-header">Status</th>
              <th className="table-header">Date</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments?.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-gray-500">{p.invoice_number}</td>
                <td className="table-cell font-medium">{(p.user as { full_name?: string })?.full_name}</td>
                <td className="table-cell text-gray-500">
                  Room {((p.booking as { room?: { room_number?: string } })?.room)?.room_number}
                </td>
                <td className="table-cell font-bold text-gray-900">${p.amount}</td>
                <td className="table-cell">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <CreditCard className="h-3 w-3" />
                    <span className="capitalize">{p.payment_method}</span>
                  </span>
                </td>
                <td className="table-cell">
                  <span className={statusBadge[p.status] ?? 'badge-gray'}>{p.status}</span>
                </td>
                <td className="table-cell text-gray-500 text-sm">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell text-right">
                  {p.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2">
                      <form action="/api/payments/confirm" method="post">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="action" value="complete" />
                        <button type="submit" className="btn-primary text-xs py-1 px-3">Confirm</button>
                      </form>
                      <form action="/api/payments/confirm" method="post">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input type="hidden" name="action" value="fail" />
                        <button type="submit" className="btn-danger text-xs py-1 px-3">Reject</button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!payments?.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No payments match your filters.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
