import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import PrintButton from './PrintButton'

export const metadata = { title: 'Receipt' }

type BookingInfo = {
  check_in: string
  check_out: string
  adults: number
  children: number
  guests: number
  guest_name: string | null
  guest_phone: string | null
  total_amount: number
  special_requests: string | null
  room: { room_number: string; name: string | null; room_type: { name: string } | null } | null
  user: { full_name: string; email: string } | null
} | null

const METHOD_LABELS: Record<string, string> = {
  online: 'Online', offline: 'Offline', cash: 'Cash', card_pos: 'Card (POS)',
  bank_transfer: 'Bank Transfer', cheque: 'Cheque', other: 'Other',
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: payment } = await supabase
    .from('payments')
    .select(`
      id, hotel_id, amount, currency, status, payment_method, payment_notes, invoice_number, paid_at, created_at,
      booking:bookings(
        check_in, check_out, adults, children, guests, guest_name, guest_phone, total_amount, special_requests,
        room:rooms(room_number, name, room_type:room_types(name)),
        user:profiles(full_name, email)
      )
    `)
    .eq('id', id)
    .single()

  if (!payment || payment.hotel_id !== tenantId) notFound()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('name, address, city, country, phone, email, currency')
    .eq('id', tenantId)
    .single()

  const currency = payment.currency || hotel?.currency || 'USD'
  const booking = payment.booking as unknown as BookingInfo
  const guestName = booking?.user?.full_name || booking?.guest_name || 'Guest'
  const guestContact = booking?.user?.email || booking?.guest_phone || ''
  const receiptNumber = payment.invoice_number || `RCPT-${payment.id.slice(0, 8).toUpperCase()}`
  const paidOn = payment.paid_at || payment.created_at

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/hotel-admin/payments" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Payments
        </Link>
        <PrintButton />
      </div>

      <div className="card p-8 print:shadow-none print:border-0">
        <div className="flex items-start justify-between border-b border-gray-100 pb-6 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{hotel?.name ?? 'Hotel'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {[hotel?.address, hotel?.city, hotel?.country].filter(Boolean).join(', ')}
            </p>
            <p className="text-sm text-gray-500">
              {[hotel?.phone, hotel?.email].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">Receipt</p>
            <p className="text-xs font-mono text-gray-500">{receiptNumber}</p>
            <p className="text-xs text-gray-500 mt-1">{new Date(paidOn).toLocaleDateString()}</p>
          </div>
        </div>

        {payment.status === 'completed' && (
          <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Payment received in full
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Billed To</p>
            <p className="font-medium text-gray-900">{guestName}</p>
            {guestContact && <p className="text-sm text-gray-500">{guestContact}</p>}
          </div>
          {booking?.room && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Room</p>
              <p className="font-medium text-gray-900">
                Room {booking.room.room_number}{booking.room.name ? ` (${booking.room.name})` : ''}
              </p>
              <p className="text-sm text-gray-500">{booking.room.room_type?.name}</p>
            </div>
          )}
        </div>

        {booking && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Check-in</p>
              <p className="text-sm font-medium text-gray-900">{new Date(booking.check_in).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Check-out</p>
              <p className="text-sm font-medium text-gray-900">{new Date(booking.check_out).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-medium text-gray-900">{METHOD_LABELS[payment.payment_method] ?? payment.payment_method}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className="font-medium text-gray-900 capitalize">{payment.status}</span>
          </div>
          {payment.payment_notes && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-gray-900">{payment.payment_notes}</span>
            </div>
          )}
          {booking && payment.amount < booking.total_amount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Booking Total</span>
              <span className="font-medium text-gray-900">{formatCurrency(booking.total_amount, currency)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 mt-4 pt-4">
          <span className="text-base font-semibold text-gray-900">Amount Paid</span>
          <span className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount, currency)}</span>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">Thank you for staying with us.</p>
      </div>
    </div>
  )
}
