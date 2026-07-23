'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, ArrowLeft, BedDouble, Calendar, CheckCircle, Loader2,
  Banknote, CreditCard, Building2, FileText, HelpCircle, DoorOpen,
  Phone, MessageCircle, Globe, User,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'

type Booking = {
  id: string
  guest_name?: string
  guest_phone?: string
  total_amount: number
  check_in: string
  check_out: string
  status: string
  source: string
  room: { room_number: string; room_type: { name: string } | null } | null
  user: { full_name: string; email: string } | null
  payments: { id: string; status: string; payment_method: string; amount: number }[]
}

const PAY_METHODS = [
  { value: 'cash',          label: 'Cash',          icon: Banknote   },
  { value: 'card_pos',      label: 'Card (POS)',    icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2  },
  { value: 'cheque',        label: 'Cheque',        icon: FileText   },
  { value: 'other',         label: 'Other',         icon: HelpCircle },
]

const sourceIcon: Record<string, React.ElementType> = {
  walk_in: DoorOpen, phone: Phone, whatsapp: MessageCircle, online: Globe,
}

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

function guestName(b: Booking) {
  return b.user?.full_name ?? b.guest_name ?? '—'
}

function guestContact(b: Booking) {
  return b.user?.email ?? b.guest_phone ?? ''
}

function dueAmount(b: Booking) {
  const payment = (b.payments ?? [])[0]
  const collected = payment?.status === 'completed' ? payment.amount : 0
  return b.total_amount - collected
}

export default function CollectPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('booking_id')

  const [query, setQuery]         = useState('')
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Booking | null>(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payNotes, setPayNotes]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currency, setCurrency]   = useState('USD')

  // Load bookings and currency
  const loadBookings = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) return

    const [{ data: hotel }, { data: raw }] = await Promise.all([
      supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
      supabase
        .from('bookings')
        .select(`
          id, guest_name, guest_phone, total_amount, check_in, check_out, status, source,
          room:rooms(room_number, room_type:room_types(name)),
          user:profiles(full_name, email),
          payments(id, status, payment_method, amount)
        `)
        .eq('hotel_id', profile.tenant_id)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .order('created_at', { ascending: false }),
    ])

    if ((hotel as { currency?: string } | null)?.currency) {
      setCurrency((hotel as { currency: string }).currency)
    }

    if (raw) {
      const data = raw as unknown as Booking[]
      // Keep bookings with no payment yet, a pending payment, or a completed
      // payment that only covered an advance (amount short of total_amount).
      const unpaid = data.filter(b => {
        const payment = (b.payments ?? [])[0]
        if (!payment) return true
        if (payment.status !== 'completed') return true
        return payment.amount < b.total_amount
      })
      setBookings(unpaid)

      // Pre-select if booking_id param provided
      if (preselectedId) {
        const found = data.find(b => b.id === preselectedId)
        if (found) setSelected(found)
      }
    }

    setLoading(false)
  }, [preselectedId])

  useEffect(() => { loadBookings() }, [loadBookings])

  const filtered = query.trim()
    ? bookings.filter(b => {
        const q = query.toLowerCase()
        return (
          guestName(b).toLowerCase().includes(q) ||
          guestContact(b).toLowerCase().includes(q) ||
          (b.room?.room_number ?? '').toLowerCase().includes(q)
        )
      })
    : bookings

  const submit = async () => {
    if (!selected) return
    setSubmitting(true)
    const res = await fetch('/api/admin/record-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id:     selected.id,
        payment_method: payMethod,
        payment_status: 'completed',
        payment_notes:  payNotes || null,
      }),
    })
    setSubmitting(false)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to record payment'); return }
    toast.success(`${formatCurrency(amountDue, currency)} payment recorded`)
    router.push('/hotel-admin/payments')
  }

  const existingPayment = selected?.payments?.[0]
  const alreadyCollected = existingPayment?.status === 'completed' ? existingPayment.amount : 0
  const amountDue = selected ? selected.total_amount - alreadyCollected : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/payments" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collect Payment</h2>
          <p className="text-gray-500 text-sm">Record cash, card or bank payment for a booking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: booking list ── */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by guest name, phone or room..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                {query ? 'No bookings match your search.' : 'All bookings are fully paid.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(b => {
                  const SourceIcon = sourceIcon[b.source] ?? Globe
                  const isSelected = selected?.id === b.id
                  const isPending = (b.payments ?? []).some(p => p.status === 'pending')

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setSelected(b); setPayMethod('cash'); setPayNotes('') }}
                      className={`w-full text-left px-4 py-3.5 transition-colors ${
                        isSelected
                          ? 'bg-primary-50 border-l-4 border-l-primary-500'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{guestName(b)}</p>
                            <SourceIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          </div>
                          <p className="text-xs text-gray-500 truncate">{guestContact(b)}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <BedDouble className="h-3 w-3" />
                              Room {b.room?.room_number}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(b.check_in).toLocaleDateString()} – {new Date(b.check_out).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="font-bold text-gray-900 text-sm">{formatCurrency(dueAmount(b), currency)}</span>
                          <span className={`${statusBadge[b.status] ?? 'badge-gray'} text-xs`}>
                            {b.status.replace('_', ' ')}
                          </span>
                          {isPending && (
                            <span className="badge-yellow text-xs">payment pending</span>
                          )}
                          {!isPending && dueAmount(b) < b.total_amount && (
                            <span className="badge-blue text-xs">advance paid</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: payment form ── */}
        <div>
          {!selected ? (
            <div className="card p-8 flex flex-col items-center justify-center text-center text-gray-400 min-h-[320px]">
              <User className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium text-gray-500">Select a booking</p>
              <p className="text-sm mt-1">Choose a booking on the left to record payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Booking summary */}
              <div className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{guestName(selected)}</p>
                    <p className="text-sm text-gray-500">{guestContact(selected)}</p>
                  </div>
                  <span className={statusBadge[selected.status] ?? 'badge-gray'}>
                    {selected.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Room</p>
                    <p className="font-medium">Room {selected.room?.room_number} · {selected.room?.room_type?.name ?? 'Standard'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Dates</p>
                    <p className="font-medium">
                      {new Date(selected.check_in).toLocaleDateString()} – {new Date(selected.check_out).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {alreadyCollected > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Advance collected</span>
                    <span className="font-medium text-gray-700">{formatCurrency(alreadyCollected, currency)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Amount due</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(amountDue, currency)}</span>
                </div>
                {existingPayment && (
                  <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                    {existingPayment.status === 'completed'
                      ? `An advance of ${formatCurrency(alreadyCollected, currency)} has already been collected — this will settle the remaining balance.`
                      : `A ${existingPayment.status} payment record exists — collecting now will update it to completed.`}
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="card p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAY_METHODS.map(m => {
                    const Icon = m.icon
                    const active = payMethod === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPayMethod(m.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium
                          ${active
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="label">Reference / Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="input"
                    placeholder="Cheque no., transfer ref, receipt number..."
                  />
                </div>

                {/* Confirm button */}
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {submitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <CheckCircle className="h-4 w-4" />
                  }
                  Collect {formatCurrency(amountDue, currency)} via{' '}
                  {PAY_METHODS.find(m => m.value === payMethod)?.label}
                </button>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  ← Choose different booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
