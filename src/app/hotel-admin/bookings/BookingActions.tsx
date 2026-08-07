'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, Wallet, AlertTriangle, Loader2, X,
  Banknote, CreditCard, Building2, FileText, HelpCircle,
  CircleDollarSign, Percent, SplitSquareHorizontal,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'

const transitions: Record<string, string[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['checked_in', 'no_show', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled:  [],
  no_show:    [],
  overdue:    [],
}

const ACTION_LABEL: Record<string, string> = {
  confirmed:   'Confirm',
  checked_in:  'Check In',
  checked_out: 'Check Out',
  no_show:     'No Show',
  cancelled:   'Cancel',
}

const roomStatusForBooking: Record<string, string> = {
  checked_in: 'booked',
  checked_out: 'cleaning',
}

const PAY_METHODS = [
  { value: 'cash',          label: 'Cash',          icon: Banknote   },
  { value: 'card_pos',      label: 'Card (POS)',    icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2  },
  { value: 'cheque',        label: 'Cheque',        icon: FileText   },
  { value: 'other',         label: 'Other',         icon: HelpCircle },
]

const ADVANCE_PRESETS = [
  { label: '25%', pct: 0.25 },
  { label: '30%', pct: 0.30 },
  { label: '50%', pct: 0.50 },
  { label: '75%', pct: 0.75 },
]

type PaymentMode = 'full' | 'advance' | 'partial'

// ─── Cancel Confirmation Modal ─────────────────────────────────────────────

function CancelConfirmModal({ onConfirm, onClose, roomCount = 1 }: {
  onConfirm: () => Promise<void>; onClose: () => void; roomCount?: number
}) {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <button onClick={onClose} disabled={loading} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Cancel Booking?</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {roomCount > 1
            ? `This will cancel all ${roomCount} rooms on this booking. The action cannot be undone.`
            : 'This will mark the booking as cancelled. The action cannot be undone.'}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">Keep Booking</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Collect + Proceed Modal ───────────────────────────────────────

type PaymentBlock = {
  primaryId: string
  targetStatus: 'confirmed' | 'checked_in' | 'checked_out' | 'record'
}

function InlinePaymentModal({
  block, onClose, onSuccess, bookingStatus,
}: {
  block: PaymentBlock
  onClose: () => void
  onSuccess: (status: string) => void
  bookingStatus: string
}) {
  const [fetching, setFetching]   = useState(true)
  const [totalAmount, setTotal]   = useState(0)
  const [collected, setCollected] = useState(0)
  const [currency, setCurrency]   = useState('USD')

  const [payMode,       setPayMode]       = useState<PaymentMode>('full')
  const [payMethod,     setPayMethod]     = useState('cash')
  const [customAmount,  setCustomAmount]  = useState('')
  const [advancePreset, setAdvancePreset] = useState<number | null>(null)
  const [submitting,    setSubmitting]    = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('total_amount, hotel:hotels(currency)').eq('id', block.primaryId).single(),
      supabase.from('payments').select('amount').eq('booking_id', block.primaryId).eq('status', 'completed'),
    ]).then(([{ data: bk }, { data: pays }]) => {
      const total = Number((bk as { total_amount?: number } | null)?.total_amount ?? 0)
      const paid  = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0)
      const cur   = (bk as { hotel?: { currency?: string } | null } | null)?.hotel?.currency ?? 'USD'
      setTotal(total); setCollected(paid); setCurrency(cur)
      setFetching(false)
    })
  }, [block.primaryId])

  const balanceDue     = totalAmount - collected
  const isFirstPayment = collected === 0

  // Advance only makes sense on first payment (no prior completed payments)
  const showAdvance = isFirstPayment && block.targetStatus !== 'checked_out'

  const collectAmount = (() => {
    if (payMode === 'full') return balanceDue
    if (payMode === 'advance' && advancePreset !== null) return Math.round(totalAmount * advancePreset * 100) / 100
    const parsed = parseFloat(customAmount)
    return isNaN(parsed) ? 0 : parsed
  })()

  const collectAmountValid = collectAmount > 0 && collectAmount <= balanceDue + 0.01

  const paymentTypeForApi = (() => {
    if (payMode === 'full' && !isFirstPayment) return 'balance'
    if (payMode === 'advance') return 'advance'
    if (payMode === 'partial') return 'partial'
    return 'full'
  })()

  const actionLabel = {
    confirmed:   'Collect & Confirm Booking',
    checked_in:  'Collect & Check In',
    checked_out: 'Collect Balance & Check Out',
    record:      'Record Payment',
  }[block.targetStatus]

  const headingLabel = {
    confirmed:   'Collect Payment to Confirm',
    checked_in:  'Collect Payment to Check In',
    checked_out: 'Collect Outstanding Balance',
    record:      'Record Payment',
  }[block.targetStatus]

  const submit = async () => {
    if (!collectAmountValid || submitting) return
    setSubmitting(true)

    // 1. Record the payment
    const payRes = await fetch('/api/admin/record-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id:     block.primaryId,
        payment_method: payMethod,
        payment_status: 'completed',
        amount:         collectAmount,
        payment_type:   paymentTypeForApi,
      }),
    })
    if (!payRes.ok) {
      const json = await payRes.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to record payment')
      setSubmitting(false)
      return
    }

    // 2. Proceed with the status action
    if (block.targetStatus === 'confirmed') {
      const confRes = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: block.primaryId }),
      })
      const confJson = await confRes.json().catch(() => ({}))
      if (!confRes.ok) {
        toast.warning('Payment recorded — but booking confirmation failed. Please confirm manually.')
      } else {
        toast.success(confJson.emailed
          ? 'Payment collected — booking confirmed & invoice emailed to guest'
          : 'Payment collected & booking confirmed')
      }

    } else if (block.targetStatus === 'checked_in') {
      const supabase = createClient()
      const { data: bk } = await supabase.from('bookings').select('room_id, room_ids').eq('id', block.primaryId).single()
      const roomIds = Array.from(new Set(
        [...((bk as { room_ids?: string[] | null } | null)?.room_ids?.length
          ? (bk as { room_ids: string[] }).room_ids
          : [(bk as { room_id?: string } | null)?.room_id]
        )].filter(Boolean) as string[]
      ))
      if (roomIds.length) await supabase.from('rooms').update({ status: 'booked' }).in('id', roomIds)
      await supabase.from('bookings').update({ status: 'checked_in' }).eq('id', block.primaryId)
      toast.success('Payment collected & guest checked in')

    } else if (block.targetStatus === 'checked_out') {
      const supabase = createClient()
      const { data: bk } = await supabase.from('bookings').select('room_id, room_ids').eq('id', block.primaryId).single()
      const roomIds = Array.from(new Set(
        [...((bk as { room_ids?: string[] | null } | null)?.room_ids?.length
          ? (bk as { room_ids: string[] }).room_ids
          : [(bk as { room_id?: string } | null)?.room_id]
        )].filter(Boolean) as string[]
      ))
      if (roomIds.length) await supabase.from('rooms').update({ status: 'cleaning' }).in('id', roomIds)
      await supabase.from('bookings').update({ status: 'checked_out' }).eq('id', block.primaryId)
      toast.success('Balance collected & guest checked out')
    } else {
      // 'record' — just record payment, no status change
      toast.success(`${formatCurrency(collectAmount, currency)} payment recorded`)
    }

    setSubmitting(false)
    onClose()
    onSuccess(
      block.targetStatus === 'confirmed'   ? 'confirmed'  :
      block.targetStatus === 'checked_in'  ? 'checked_in' :
      block.targetStatus === 'checked_out' ? 'checked_out' :
      bookingStatus
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900">{headingLabel}</h3>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Amount summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="space-y-0.5">
                {collected > 0 && (
                  <p className="text-xs text-gray-500">Advance paid: <span className="text-emerald-600 font-medium">{formatCurrency(collected, currency)}</span></p>
                )}
                <p className="text-xs text-gray-500">Balance due</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(balanceDue, currency)}</p>
              </div>
              {collected > 0 && (
                <div className="text-right text-xs text-gray-400">
                  <p>Total booking</p>
                  <p className="font-medium text-gray-700">{formatCurrency(totalAmount, currency)}</p>
                </div>
              )}
            </div>

            {/* Payment type */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Type</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    mode: 'full' as PaymentMode,
                    label: isFirstPayment ? 'Full Payment' : 'Full Balance',
                    icon: CircleDollarSign,
                    desc: formatCurrency(balanceDue, currency),
                  },
                  {
                    mode: 'advance' as PaymentMode,
                    label: 'Advance',
                    icon: Percent,
                    desc: 'Deposit only',
                    disabled: !showAdvance,
                  },
                  {
                    mode: 'partial' as PaymentMode,
                    label: 'Custom',
                    icon: SplitSquareHorizontal,
                    desc: 'Enter amount',
                  },
                ].map(({ mode, label, icon: Icon, desc, disabled }) => (
                  <button key={mode} type="button" disabled={disabled}
                    onClick={() => { setPayMode(mode); setCustomAmount(''); setAdvancePreset(null) }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed
                      ${payMode === mode ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    <span className={`text-[10px] ${payMode === mode ? 'text-primary-500' : 'text-gray-400'}`}>{desc}</span>
                  </button>
                ))}
              </div>

              {/* Advance presets */}
              {payMode === 'advance' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {ADVANCE_PRESETS.map(p => {
                      const amt = Math.round(totalAmount * p.pct * 100) / 100
                      const active = advancePreset === p.pct
                      return (
                        <button key={p.label} type="button"
                          onClick={() => { setAdvancePreset(p.pct); setCustomAmount(amt.toFixed(2)) }}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 text-xs font-semibold transition-all
                            ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                          <span className="text-sm font-bold">{p.label}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(amt, currency)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom / advance amount input */}
              {(payMode === 'advance' || payMode === 'partial') && (
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{currency}</span>
                    <input
                      type="number" min="1" max={balanceDue} step="0.01"
                      value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setAdvancePreset(null) }}
                      placeholder={payMode === 'advance' ? `Max ${balanceDue.toFixed(2)}` : `Max ${balanceDue.toFixed(2)}`}
                      className="input pl-16"
                    />
                  </div>
                  {collectAmount > 0 && collectAmount < balanceDue && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      Remaining {formatCurrency(balanceDue - collectAmount, currency)} will be collected later.
                    </p>
                  )}
                  {collectAmount > balanceDue + 0.01 && (
                    <p className="text-xs text-red-500 mt-1.5">Cannot exceed balance due.</p>
                  )}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PAY_METHODS.map(m => {
                  const Icon = m.icon
                  const active = payMethod === m.value
                  return (
                    <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-[10px] font-medium
                        ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-center leading-tight">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting || !collectAmountValid}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {submitting ? 'Processing…' : collectAmountValid ? `${actionLabel} · ${formatCurrency(collectAmount, currency)}` : actionLabel}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center -mt-2">
              Or{' '}
              <Link href={`/hotel-admin/payments/collect?booking_id=${block.primaryId}`} onClick={onClose}
                className="text-primary-600 hover:underline">
                open full payment page
              </Link>
              {' '}for more options
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function BookingActions({
  bookingId,
  bookingIds,
  currentStatus,
  checkIn,
  onStatusChange,
}: {
  bookingId?: string
  bookingIds?: string[]
  currentStatus: string
  checkIn?: string
  onStatusChange?: (newStatus: string) => void
}) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [paymentBlock,    setPaymentBlock]    = useState<PaymentBlock | null>(null)
  const [closeMenu,       setCloseMenu]       = useState<(() => void) | null>(null)

  const ids    = bookingIds?.length ? bookingIds : bookingId ? [bookingId] : []
  const many   = ids.length > 1
  const suffix = many ? ` · ${ids.length} rooms` : ''

  const updateStatus = async (status: string, close: () => void) => {
    if (status === 'cancelled') {
      setCloseMenu(() => close)
      setShowCancelModal(true)
      return
    }

    // Confirming — requires a payment. Show inline collect modal rather than just warning.
    if (status === 'confirmed') {
      const supabase = createClient()
      const primaryId = bookingId ?? ids[0]
      const { data: completed } = await supabase
        .from('payments').select('id').in('booking_id', ids).eq('status', 'completed').limit(1)

      if (!completed || completed.length === 0) {
        close()
        setPaymentBlock({ primaryId, targetStatus: 'confirmed' })
        return
      }

      // Payment already exists — call confirm API directly
      let emailed = false
      for (const id of ids) {
        const res = await fetch('/api/bookings/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: id }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(json.error ?? 'Failed to confirm booking')
          close()
          return
        }
        emailed = emailed || !!json.emailed
      }
      toast.success(emailed ? `Booking confirmed — invoice emailed to guest${suffix}` : `Booking confirmed${suffix}`)
      close()
      onStatusChange?.('confirmed')
      router.refresh()
      return
    }

    const supabase = createClient()

    // Block check-in if date already passed
    if (status === 'checked_in' && checkIn) {
      const today = new Date().toISOString().slice(0, 10)
      if (checkIn < today) {
        toast.error(`Check-in date (${checkIn}) has already passed. Please mark this booking as "No Show" instead.`)
        close()
        return
      }
    }

    // Block check-in if no payment — show inline collect modal
    if (status === 'checked_in') {
      const { data: completed } = await supabase
        .from('payments').select('id').in('booking_id', ids).eq('status', 'completed').limit(1)

      if (!completed || completed.length === 0) {
        close()
        setPaymentBlock({ primaryId: bookingId ?? ids[0], targetStatus: 'checked_in' })
        return
      }
    }

    // Block checkout if outstanding balance — show inline collect modal
    if (status === 'checked_out') {
      const [{ data: bookingRows }, { data: completedPayments }] = await Promise.all([
        supabase.from('bookings').select('total_amount').in('id', ids),
        supabase.from('payments').select('amount').in('booking_id', ids).eq('status', 'completed'),
      ])
      const totalDue    = (bookingRows ?? []).reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
      const totalPaid   = (completedPayments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
      const outstanding = Math.round((totalDue - totalPaid) * 100) / 100

      if (outstanding > 0) {
        close()
        setPaymentBlock({ primaryId: bookingId ?? ids[0], targetStatus: 'checked_out' })
        return
      }
    }

    // Flip room status for physical rooms
    const roomStatus = roomStatusForBooking[status]
    if (roomStatus) {
      const { data } = await supabase.from('bookings').select('room_id, room_ids').in('id', ids)
      const roomIds = Array.from(new Set(
        (data ?? []).flatMap((b: { room_id: string; room_ids: string[] | null }) =>
          b.room_ids?.length ? b.room_ids : [b.room_id],
        ).filter(Boolean),
      ))
      if (roomIds.length) await supabase.from('rooms').update({ status: roomStatus }).in('id', roomIds)
    }

    const { error } = await supabase.from('bookings').update({ status }).in('id', ids)
    if (error) { toast.error(error.message); return }
    toast.success(`Booking ${status.replace('_', ' ')}${suffix}`)
    close()
    onStatusChange?.(status)
    router.refresh()
  }

  const confirmCancel = async () => {
    const supabase = createClient()
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).in('id', ids)
    if (error) { toast.error(error.message); return }
    toast.success(`Booking cancelled${suffix}`)
    setShowCancelModal(false)
    closeMenu?.()
    onStatusChange?.('cancelled')
    router.refresh()
  }

  const next = transitions[currentStatus] ?? []

  if (next.length === 0) return <span className="text-xs text-gray-400">—</span>

  const showRecordPayment = ['pending', 'confirmed', 'checked_in'].includes(currentStatus)

  return (
    <>
      <ActionMenu
        button={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
        buttonClassName="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        buttonAriaLabel="Booking actions"
      >
        {close => (
          <>
            {next.map(status => (
              <button key={status} role="menuitem" onClick={() => updateStatus(status, close)}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                  status === 'cancelled' ? 'text-red-700 hover:bg-red-50'
                  : status === 'no_show' ? 'text-orange-700 hover:bg-orange-50'
                  : 'text-gray-700'
                }`}>
                {ACTION_LABEL[status] ?? status.replace('_', ' ')}
              </button>
            ))}
            {showRecordPayment && (
              <>
                {next.length > 0 && <div className="border-t border-gray-100 my-1" />}
                <button
                  role="menuitem"
                  onClick={() => { close(); setPaymentBlock({ primaryId: bookingId ?? ids[0], targetStatus: 'record' }) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-emerald-700 hover:bg-emerald-50"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Record Payment
                </button>
              </>
            )}
          </>
        )}
      </ActionMenu>

      {showCancelModal && (
        <CancelConfirmModal
          onConfirm={confirmCancel}
          onClose={() => setShowCancelModal(false)}
          roomCount={ids.length}
        />
      )}

      {paymentBlock && (
        <InlinePaymentModal
          block={paymentBlock}
          onClose={() => setPaymentBlock(null)}
          bookingStatus={currentStatus}
          onSuccess={status => {
            setPaymentBlock(null)
            onStatusChange?.(status)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
