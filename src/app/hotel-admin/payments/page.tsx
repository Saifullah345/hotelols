import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CreditCard, CheckCircle2, Clock } from 'lucide-react'
import PaymentsClient, { type PaymentRow } from './PaymentsClient'
import { formatCurrency } from '@/lib/currency'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const [{ data: payments }, { data: hotelInfo }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id, booking_id, amount, currency, status, payment_method,
        invoice_number, paid_at, created_at,
        booking:bookings(
          check_in, check_out, guest_name, guest_phone, total_amount, room_ids,
          room:rooms(room_number),
          user:profiles(full_name, email)
        )
      `)
      .eq('hotel_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase.from('hotels').select('currency').eq('id', tenantId).single(),
  ])
  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  const paymentList = (payments ?? []) as unknown as PaymentRow[]
  const completedTotal = paymentList.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0)
  const pendingCount = paymentList.filter(p => p.status === 'pending').length

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
            <h2 className="text-2xl font-extrabold text-white leading-tight">Payments</h2>
            <p className="text-indigo-300 text-sm mt-0.5">All receipts and payment records</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <CreditCard className="h-4 w-4 text-indigo-300" />
              <div>
                <p className="text-white font-bold leading-none">{paymentList.length}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{formatCurrency(completedTotal, currency)}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Collected</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-white font-bold leading-none">{pendingCount}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Pending</p>
              </div>
            </div>
            <Link href="/hotel-admin/payments/collect" className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Collect Payment
            </Link>
          </div>
        </div>
      </div>

      <PaymentsClient
        payments={paymentList}
        currency={currency}
        today={new Date().toISOString().split('T')[0]}
      />
    </div>
  )
}
