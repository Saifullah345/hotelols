'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Wallet, Loader2, X,
  Banknote, CreditCard, Building2, FileText, HelpCircle,
  CircleDollarSign, Percent, SplitSquareHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'

export const PAY_METHODS = [
  { value: 'cash',          label: 'Cash',          icon: Banknote   },
  { value: 'card_pos',      label: 'Card (POS)',    icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2  },
  { value: 'cheque',        label: 'Cheque',        icon: FileText   },
  { value: 'other',         label: 'Other',         icon: HelpCircle },
]

export const ADVANCE_PRESETS = [
  { label: '25%', pct: 0.25 },
  { label: '30%', pct: 0.30 },
  { label: '50%', pct: 0.50 },
  { label: '75%', pct: 0.75 },
]

export type PaymentMode = 'full' | 'advance' | 'partial'

export type InlinePaymentBlock = {
  primaryId: string
  targetStatus: 'confirmed' | 'checked_in' | 'checked_out' | 'record'
}

export function InlinePaymentModal({
  block, onClose, onSuccess, bookingStatus,
}: {
  block: InlinePaymentBlock
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

              {(payMode === 'advance' || payMode === 'partial') && (
                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{currency}</span>
                    <input
                      type="number" min="1" max={balanceDue} step="0.01"
                      value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setAdvancePreset(null) }}
                      placeholder={`Max ${balanceDue.toFixed(2)}`}
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
