'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, CreditCard, CheckCircle, Clock, Receipt,
  BedDouble, User, Phone, Calendar, Trash2, AlertTriangle, Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { DATE_RANGES, resolveDateWindow, inWindow } from '@/lib/dateRange'
import DateRangeChips from '@/components/admin/DateRangeChips'
import Pagination from '@/components/admin/Pagination'
import { toast } from 'sonner'

export type PaymentRow = {
  id: string
  booking_id: string | null
  amount: number
  currency: string
  status: string
  payment_method: string
  invoice_number: string | null
  paid_at: string | null
  created_at: string
  booking: {
    check_in: string
    check_out: string
    guest_name: string | null
    guest_phone: string | null
    total_amount: number
    room_ids: string[] | null
    room: { room_number: string } | null
    user: { full_name: string; email: string } | null
  } | null
}

type PaymentLabel = 'advance' | 'balance' | 'full' | null

function computeLabels(payments: PaymentRow[]): Map<string, PaymentLabel> {
  // Group completed payments by booking_id, sorted oldest-first
  const byBooking = new Map<string, PaymentRow[]>()
  for (const p of payments) {
    if (!p.booking_id || p.status !== 'completed') continue
    const arr = byBooking.get(p.booking_id) ?? []
    arr.push(p)
    byBooking.set(p.booking_id, arr)
  }

  const labels = new Map<string, PaymentLabel>()
  for (const [, group] of byBooking) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const total = sorted[0].booking?.total_amount ?? 0

    if (sorted.length === 1) {
      // Single payment — full or advance (partial)
      labels.set(sorted[0].id, sorted[0].amount >= total ? 'full' : 'advance')
    } else {
      // Multiple payments — first is advance, rest are balance instalments
      sorted.forEach((p, i) => labels.set(p.id, i === 0 ? 'advance' : 'balance'))
    }
  }
  return labels
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-green',
  pending:   'badge-yellow',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  completed: CheckCircle,
  pending:   Clock,
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', card_pos: 'Card (POS)', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', online: 'Online', offline: 'Offline', other: 'Other',
}

const STATUSES = ['completed', 'pending']
const METHODS  = ['cash', 'card_pos', 'bank_transfer', 'cheque', 'online', 'other']

function guestName(p: PaymentRow) {
  return p.booking?.user?.full_name ?? p.booking?.guest_name ?? '—'
}
function guestSub(p: PaymentRow) {
  return p.booking?.user?.email ?? p.booking?.guest_phone ?? ''
}

export default function PaymentsClient({
  payments: initial,
  currency,
  today: serverToday,
}: {
  payments: PaymentRow[]
  currency: string
  today: string
}) {
  const [payments, setPayments] = useState(initial)
  const [q,        setQ]        = useState('')
  const [status,   setStatus]   = useState('')
  const [method,   setMethod]   = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Paid-on date filter ───────────────────────────────────────────
  // Server value first so hydration matches, then the viewer's own date.
  const [today, setToday] = useState(serverToday)
  useEffect(() => { setToday(todayISO()) }, [])
  const [dateRange, setDateRange]   = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  // A payment is dated by when it was taken; unpaid rows fall back to creation.
  const paidOn = (p: PaymentRow) => p.paid_at ?? p.created_at

  const paidWindow = useMemo(
    () => resolveDateWindow(dateRange, today, customFrom, customTo),
    [dateRange, today, customFrom, customTo],
  )

  const rangeCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of DATE_RANGES) {
      const w = resolveDateWindow(r.key, today)
      out[r.key] = payments.filter(p => inWindow(paidOn(p), w)).length
    }
    return out
  }, [payments, today])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/admin/payments/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to delete payment')
      return
    }
    setPayments(prev => prev.filter(x => x.id !== deleteTarget.id))
    toast.success('Payment deleted')
    setDeleteTarget(null)
  }

  const labels = useMemo(() => computeLabels(payments), [payments])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return payments.filter(p => {
      if (status && p.status !== status) return false
      if (method && p.payment_method !== method) return false
      if (!inWindow(paidOn(p), paidWindow)) return false
      if (!term) return true
      return (
        guestName(p).toLowerCase().includes(term) ||
        guestSub(p).toLowerCase().includes(term) ||
        (p.booking?.room?.room_number ?? '').toLowerCase().includes(term) ||
        (p.invoice_number ?? '').toLowerCase().includes(term) ||
        (p.booking?.guest_phone ?? '').includes(term)
      )
    })
  }, [payments, q, status, method, paidWindow])

  // Stats from full dataset
  const totalRevenue   = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const pendingAmount  = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const hasFilter = !!(q || status || method || dateRange !== 'all')

  // ── Pagination ────────────────────────────────────────────────────
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)
  useEffect(() => { setPage(1) }, [q, status, method, dateRange, customFrom, customTo, perPage])

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / perPage)))
  const paged    = filtered.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalRevenue, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Pending</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(pendingAmount, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search guest name, phone, room, invoice…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Methods</option>
            {METHODS.map(m => (
              <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={() => { setQ(''); setStatus(''); setMethod(''); setDateRange('all'); setCustomFrom(''); setCustomTo('') }}
              className="text-sm text-gray-500 hover:text-gray-800 px-2"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Paid-on filter — today through the last 10 days */}
        <div className="border-t border-gray-100 pt-3">
          <DateRangeChips
            label="Paid"
            value={dateRange}
            onChange={setDateRange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
            today={today}
            counts={rangeCounts}
          />
        </div>
      </div>

      {/* Payment cards */}
      <div className="card overflow-hidden divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No payments found</p>
            <p className="text-sm mt-1">{hasFilter ? 'Try a different search or filter.' : 'No payments recorded yet.'}</p>
          </div>
        ) : (
          paged.map(p => {
            const Icon = STATUS_ICON[p.status] ?? Clock
            const name = guestName(p)
            const sub  = guestSub(p)
            const date = new Date(p.paid_at ?? p.created_at).toLocaleDateString('en', {
              day: '2-digit', month: 'short', year: 'numeric',
            })

            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  p.status === 'completed' ? 'bg-green-50' :
                  p.status === 'pending'   ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    p.status === 'completed' ? 'text-green-600' :
                    p.status === 'pending'   ? 'text-amber-600' : 'text-red-500'
                  }`} />
                </div>

                {/* Guest */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{name}</p>
                    <span className={`${STATUS_BADGE[p.status] ?? 'badge-gray'} text-xs flex-shrink-0`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {sub && (
                      <span className="flex items-center gap-1 truncate">
                        {p.booking?.user ? <User className="h-3 w-3 flex-shrink-0" /> : <Phone className="h-3 w-3 flex-shrink-0" />}
                        {sub}
                      </span>
                    )}
                    {p.booking?.room && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <BedDouble className="h-3 w-3" /> Room {p.booking.room.room_number}
                        {/* Multi-room booking — the receipt itemises them all. */}
                        {(p.booking.room_ids?.length ?? 0) > 1 && (
                          <span className="text-blue-600 font-medium">+{p.booking.room_ids!.length - 1}</span>
                        )}
                      </span>
                    )}
                    {p.booking && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.booking.check_in).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {new Date(p.booking.check_out).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + label + method */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="flex items-center justify-end gap-2">
                    <p className="font-bold text-gray-900">{formatCurrency(p.amount, currency)}</p>
                    {labels.get(p.id) === 'advance' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Advance
                      </span>
                    )}
                    {labels.get(p.id) === 'balance' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Balance
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-gray-400 mt-0.5">
                    <CreditCard className="h-3 w-3" />
                    {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                  </div>
                </div>

                {/* Date */}
                <div className="text-right flex-shrink-0 hidden md:block w-24">
                  <p className="text-sm text-gray-500">{date}</p>
                  {p.invoice_number && (
                    <p className="text-xs font-mono text-gray-300 mt-0.5 truncate">{p.invoice_number}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.status === 'completed' ? (
                    <Link
                      href={`/hotel-admin/payments/${p.id}/receipt`}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Receipt
                    </Link>
                  ) : p.status === 'pending' ? (
                    <Link
                      href={`/hotel-admin/payments/collect?booking_id=${p.booking_id}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Collect
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete payment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}

        <Pagination
          page={page}
          onPage={setPage}
          perPage={perPage}
          onPerPage={setPerPage}
          total={filtered.length}
          noun="payment"
        />
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base">Delete Payment?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You are about to delete the{' '}
                  <span className="font-semibold text-gray-700">{formatCurrency(deleteTarget.amount, currency)}</span>{' '}
                  payment for <span className="font-semibold text-gray-700">{guestName(deleteTarget)}</span>.
                </p>
                <p className="text-xs text-red-500 mt-2 font-medium">This cannot be undone and will remove the receipt.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
