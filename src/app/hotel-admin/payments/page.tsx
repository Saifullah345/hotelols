import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PaymentsClient, { type PaymentRow } from './PaymentsClient'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, booking_id, amount, currency, status, payment_method,
      invoice_number, paid_at, created_at,
      booking:bookings(
        check_in, check_out, guest_name, guest_phone, total_amount,
        room:rooms(room_number),
        user:profiles(full_name, email)
      )
    `)
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  const { data: hotelInfo } = await supabase
    .from('hotels').select('currency').eq('id', tenantId).single()
  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-500 text-sm mt-1">All receipts and payment records</p>
        </div>
        <Link href="/hotel-admin/payments/collect" className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus className="h-4 w-4" /> Collect Payment
        </Link>
      </div>

      <PaymentsClient
        payments={(payments ?? []) as unknown as PaymentRow[]}
        currency={currency}
      />
    </div>
  )
}
