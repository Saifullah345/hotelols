import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import Link from 'next/link'
import { Plus, CreditCard, CheckCircle2, Clock } from 'lucide-react'
import PaymentsClient, { type PaymentRow } from './PaymentsClient'
import { formatCurrency } from '@/lib/currency'

export const metadata = { title: 'Payments' }

const INITIAL_SIZE = 10

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { tenantId } = await requireTenant()

  const [{ data: payments }, { data: hotelInfo }, { count: totalCount }, { count: pendingCount }, { data: completedData }] = await Promise.all([
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
      .order('created_at', { ascending: false })
      .range(0, INITIAL_SIZE - 1),
    supabase.from('hotels').select('currency').eq('id', tenantId).single(),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('hotel_id', tenantId).eq('status', 'pending'),
    supabase.from('payments').select('amount').eq('hotel_id', tenantId).eq('status', 'completed'),
  ])
  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  const paymentList = (payments ?? []) as unknown as PaymentRow[]
  const hasMore = paymentList.length === INITIAL_SIZE
  const collectedTotal = (completedData ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0)

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
            <h2 className="text-2xl font-extrabold text-white leading-tight">Payments</h2>
            <p className="text-primary-300 text-sm mt-0.5">All receipts and payment records</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <CreditCard className="h-4 w-4 text-primary-300" />
              <div>
                <p className="text-white font-bold leading-none">{totalCount}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{formatCurrency(collectedTotal, currency)}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Collected</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-white font-bold leading-none">{pendingCount}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Pending</p>
              </div>
            </div>
            <Link href="/hotel-admin/payments/collect" className="flex items-center gap-2 bg-white text-primary-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Collect Payment
            </Link>
          </div>
        </div>
      </div>

      <PaymentsClient
        payments={paymentList}
        hasMore={hasMore}
        currency={currency}
        today={new Date().toISOString().split('T')[0]}
        totalPayments={totalCount ?? 0}
        pendingPayments={pendingCount ?? 0}
        collectedTotal={collectedTotal}
      />
    </div>
  )
}