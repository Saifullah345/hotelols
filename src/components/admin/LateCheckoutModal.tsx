'use client'

import { Loader2, X, Clock, AlertTriangle, CalendarX } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

export type LateCheckoutInfo = {
  bookingId:         string
  scheduledCheckout: string   // YYYY-MM-DD
  extraDays:         number   // how many calendar days past checkout
  chargeType:        'half_day' | 'full_night'
  nightRate:         number   // per-night rate = original_total / original_nights
  lateCharge:        number   // total late fee
  originalAmount:    number
  paidAmount:        number
  currency:          string
  halfDayPct:        number   // e.g. 50
  cutoffTime:        string   // e.g. "14:00"
}

export function LateCheckoutModal({
  info,
  onConfirm,
  onClose,
  confirming,
}: {
  info:       LateCheckoutInfo
  onConfirm:  () => Promise<void>
  onClose:    () => void
  confirming: boolean
}) {
  const newTotal   = info.originalAmount + info.lateCharge
  const balance    = newTotal - info.paidAmount
  const fmt        = (n: number) => formatCurrency(n, info.currency)

  const chargeLabel = info.chargeType === 'half_day'
    ? `Half-day charge (${info.halfDayPct}% of ${fmt(info.nightRate)}/night)`
    : `Full extra night @ ${fmt(info.nightRate)}/night`

  const dayWord = info.extraDays === 1 ? 'day' : 'days'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !confirming && onClose()}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <CalendarX className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Late Checkout Detected</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {info.extraDays} {dayWord} past scheduled checkout ({info.scheduledCheckout})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={confirming}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Policy notice */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            {info.chargeType === 'half_day'
              ? `Guest checked out before ${info.cutoffTime} — half-day rate (${info.halfDayPct}%) applies.`
              : `Guest checked out at or after ${info.cutoffTime} — full night rate applies.`}
          </p>
        </div>

        {/* Charge breakdown */}
        <div className="px-6 pt-4 pb-2 space-y-2.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Charge Breakdown</p>

          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            <Row label="Original booking amount" value={fmt(info.originalAmount)} />
            {info.extraDays > 1 && (
              <Row
                label={`${info.extraDays - 1} full extra night${info.extraDays - 1 > 1 ? 's' : ''} @ ${fmt(info.nightRate)}/night`}
                value={fmt((info.extraDays - 1) * info.nightRate)}
                accent
              />
            )}
            <Row
              label={chargeLabel}
              value={fmt(
                info.chargeType === 'half_day'
                  ? info.nightRate * (info.halfDayPct / 100)
                  : info.nightRate,
              )}
              accent
            />
            <Row label="New total" value={fmt(newTotal)} bold />
          </div>
        </div>

        {/* Payment summary */}
        <div className="px-6 pt-2 pb-4 space-y-2.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Summary</p>

          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            <Row label="Already paid" value={fmt(info.paidAmount)} />
            <Row
              label="Remaining balance to collect"
              value={fmt(Math.max(0, balance))}
              bold
              highlight={balance > 0}
            />
          </div>

          {balance <= 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Guest has already covered the late charge. No additional payment needed.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={confirming}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {confirming
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying charge…</>
              : balance > 0
                ? `Collect ${fmt(balance)} & Check Out`
                : 'Confirm & Check Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({
  label, value, bold, accent, highlight,
}: {
  label: string; value: string; bold?: boolean; accent?: boolean; highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-3">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : accent ? 'text-indigo-700' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${
        highlight ? 'text-red-600' : bold ? 'text-gray-900' : accent ? 'text-indigo-700' : 'text-gray-700'
      }`}>
        {value}
      </span>
    </div>
  )
}
