import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, CheckCircle2, Clock, User, BedDouble,
  Calendar, CreditCard, Hash,
} from 'lucide-react'
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

  // Independent of each other — fetch together rather than in series.
  // The payment is still authorised against tenant_id below before anything renders.
  const [{ data: profile }, { data: payment }] = await Promise.all([
    supabase.from('profiles').select('tenant_id').eq('id', user.id).single(),
    supabase
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
      .single(),
  ])

  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

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
  const isPaid = payment.status === 'completed'

  const nights = booking
    ? Math.max(1, Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000))
    : null
  const nightlyRate = booking && nights ? booking.total_amount / nights : null
  const balanceDue = booking ? Math.max(booking.total_amount - payment.amount, 0) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/hotel-admin/payments" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Payments
        </Link>
        <PrintButton />
      </div>

      <div className="card overflow-hidden border-t-4 border-t-primary-600 print:shadow-none print:border print:border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-8 pb-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{hotel?.name ?? 'Hotel'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[hotel?.address, hotel?.city, hotel?.country].filter(Boolean).join(', ')}
              </p>
              <p className="text-sm text-gray-500">
                {[hotel?.phone, hotel?.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest">Receipt</p>
            <p className="text-xs font-mono text-gray-400 mt-1">{receiptNumber}</p>
            <p className="text-xs text-gray-400">{new Date(paidOn).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div
          className={`mx-8 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
            isPaid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isPaid ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <Clock className="h-4 w-4 flex-shrink-0" />}
          {isPaid
            ? (balanceDue > 0 ? 'Partial payment received' : 'Payment received in full')
            : `Payment ${payment.status}`}
        </div>

        {/* Guest + Room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-8 mt-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <User className="h-3.5 w-3.5" /> Billed To
            </div>
            <p className="font-semibold text-gray-900">{guestName}</p>
            {guestContact && <p className="text-sm text-gray-500 mt-0.5">{guestContact}</p>}
          </div>
          {booking?.room && (
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                <BedDouble className="h-3.5 w-3.5" /> Room
              </div>
              <p className="font-semibold text-gray-900">
                Room {booking.room.room_number}{booking.room.name ? ` (${booking.room.name})` : ''}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{booking.room.room_type?.name}</p>
            </div>
          )}
        </div>

        {/* Stay dates */}
        {booking && (
          <div className="grid grid-cols-3 gap-4 px-8 mt-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                <Calendar className="h-3.5 w-3.5" /> Check-in
              </div>
              <p className="text-sm font-semibold text-gray-900">{new Date(booking.check_in).toLocaleDateString()}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                <Calendar className="h-3.5 w-3.5" /> Check-out
              </div>
              <p className="text-sm font-semibold text-gray-900">{new Date(booking.check_out).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Nights</p>
              <p className="text-sm font-semibold text-gray-900">{nights}</p>
            </div>
          </div>
        )}

        {/* Charges */}
        <div className="mx-8 mt-6 border-t border-gray-100" />
        <div className="px-8 pt-5">
          {booking && nightlyRate != null && (
            <div className="flex items-center justify-between text-sm pb-3">
              <span className="text-gray-600">
                Room charge — {nights} night{nights !== 1 ? 's' : ''} × {formatCurrency(nightlyRate, currency)}
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(booking.total_amount, currency)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex items-center justify-between text-sm pb-3 text-amber-600">
              <span>Balance due later</span>
              <span className="font-medium">−{formatCurrency(balanceDue, currency)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-8 py-5 mx-8 bg-primary-50/60 rounded-xl mb-6 mt-1">
          <span className="text-base font-semibold text-gray-900">Amount Paid</span>
          <span className="text-2xl font-extrabold text-primary-700">{formatCurrency(payment.amount, currency)}</span>
        </div>

        {/* Payment meta */}
        <div className="grid grid-cols-2 gap-3 px-8 pb-6 text-sm">
          <div className="flex items-center gap-1.5 text-gray-500">
            <CreditCard className="h-3.5 w-3.5" /> Payment Method
          </div>
          <div className="text-right font-medium text-gray-900">{METHOD_LABELS[payment.payment_method] ?? payment.payment_method}</div>

          <div className="flex items-center gap-1.5 text-gray-500">
            <Hash className="h-3.5 w-3.5" /> Reference
          </div>
          <div className="text-right font-medium text-gray-900">{payment.payment_notes || '—'}</div>
        </div>

        <div className="border-t border-gray-100 px-8 py-5 text-center">
          <p className="text-sm font-medium text-gray-600">Thank you for staying with us.</p>
          <p className="text-xs text-gray-400 mt-1">This is a computer-generated receipt.</p>
        </div>
      </div>
    </div>
  )
}
