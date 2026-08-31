'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, AlertTriangle, Loader2, X, Wallet,
  CalendarPlus, RotateCcw, Receipt,
} from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'
import { InlinePaymentModal, PAY_METHODS, type InlinePaymentBlock } from '@/components/admin/InlinePaymentModal'
import { LateCheckoutModal, type LateCheckoutInfo } from '@/components/admin/LateCheckoutModal'

const transitions: Record<string, string[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['checked_in', 'no_show', 'cancelled'],
  checked_in:  ['checked_out'],
  checked_out: [],
  cancelled:   [],
  no_show:     ['checked_in'],   // Override Check-In for late arrivals
  overdue:     [],
}

const ACTION_LABEL: Record<string, string> = {
  confirmed:   'Confirm',
  checked_in:  'Check In',
  checked_out: 'Check Out',
  no_show:     'No Show',
  cancelled:   'Cancel',
}

const roomStatusForBooking: Record<string, string> = {
  checked_in:  'booked',
  checked_out: 'cleaning',
}

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

// InlinePaymentModal, PAY_METHODS, ADVANCE_PRESETS, PaymentMode imported from @/components/admin/InlinePaymentModal
type PaymentBlock = InlinePaymentBlock

// ─── Refund Modal ──────────────────────────────────────────────────────────
// Used when a no-show guest paid in advance and needs a refund.

function RefundModal({
  bookingId, onClose, onSuccess,
}: {
  bookingId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [fetching,    setFetching]   = useState(true)
  const [totalPaid,   setTotalPaid]  = useState(0)
  const [currency,    setCurrency]   = useState('USD')
  const [amount,      setAmount]     = useState('')
  const [method,      setMethod]     = useState('cash')
  const [submitting,  setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('hotel:hotels(currency)').eq('id', bookingId).single(),
      supabase.from('payments').select('amount').eq('booking_id', bookingId).eq('status', 'completed'),
    ]).then(([{ data: bk }, { data: pays }]) => {
      const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0)
      setTotalPaid(paid)
      setCurrency((bk as { hotel?: { currency?: string } | null } | null)?.hotel?.currency ?? 'USD')
      setAmount(paid > 0 ? paid.toFixed(2) : '')
      setFetching(false)
    })
  }, [bookingId])

  const refundAmount = parseFloat(amount) || 0
  const isValid = refundAmount > 0 && refundAmount <= totalPaid + 0.01

  const submit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/admin/record-refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, amount: refundAmount, payment_method: method }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error ?? 'Failed to record refund')
      setSubmitting(false)
      return
    }
    toast.success(`Refund of ${formatCurrency(refundAmount, currency)} recorded`)
    onClose()
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6">
        <button onClick={onClose} disabled={submitting} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <RotateCcw className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Process Refund</h3>
            <p className="text-xs text-gray-500">Record a refund for this no-show booking</p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : totalPaid === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No payments were collected for this booking.</p>
            <p className="text-xs text-gray-400 mt-1">There is nothing to refund.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">Total paid by guest</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid, currency)}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Refund Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{currency}</span>
                <input
                  type="number" min="0.01" max={totalPaid} step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input pl-16"
                />
              </div>
              {refundAmount > totalPaid + 0.01 && (
                <p className="text-xs text-red-500 mt-1">Cannot exceed amount paid ({formatCurrency(totalPaid, currency)}).</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Refund Method</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PAY_METHODS.map(m => {
                  const Icon = m.icon
                  return (
                    <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-[10px] font-medium ${
                        method === m.value ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                      }`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-center leading-tight">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={submit} disabled={!isValid || submitting}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {submitting ? 'Processing…' : `Refund${isValid ? ` ${formatCurrency(refundAmount, currency)}` : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Extend Stay Modal ─────────────────────────────────────────────────────
// Pushes out the check-out date and adds extra night charges to the bill.
// Checks room availability live before allowing submission.

function ExtendStayModal({
  ids, onClose, onSuccess,
}: {
  ids: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const primaryId = ids[0]

  const [fetching,         setFetching]         = useState(true)
  const [checkIn,          setCheckIn]          = useState('')
  const [checkOut,         setCheckOut]         = useState('')
  const [currency,         setCurrency]         = useState('USD')
  const [rows,             setRows]             = useState<{ id: string; total_amount: number }[]>([])
  // All physical room IDs covered by this booking (used for conflict detection)
  const [roomIds,          setRoomIds]          = useState<string[]>([])
  const [newCheckOut,      setNewCheckOut]      = useState('')
  const [checking,         setChecking]         = useState(false)
  const [conflictingRooms, setConflictingRooms] = useState<string[]>([])
  const [submitting,       setSubmitting]       = useState(false)

  // Load booking data
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('id, check_in, check_out, total_amount, room_id, room_ids, hotel:hotels(currency)').eq('id', primaryId).single(),
      ids.length > 1
        ? supabase.from('bookings').select('id, total_amount, room_id, room_ids').in('id', ids.slice(1))
        : Promise.resolve({ data: [] as { id: string; total_amount: number; room_id: string; room_ids: string[] | null }[] }),
    ]).then(([{ data: primary }, { data: rest }]) => {
      if (primary) {
        const p = primary as { id: string; check_in: string; check_out: string; total_amount: number; room_id: string; room_ids: string[] | null; hotel?: { currency?: string } | null }
        setCheckIn(p.check_in)
        setCheckOut(p.check_out)
        setNewCheckOut(p.check_out)
        setCurrency(p.hotel?.currency ?? 'USD')

        type BookingRow = { id: string; total_amount: number; room_id: string; room_ids: string[] | null }
        const allBookings: BookingRow[] = [
          { id: p.id, total_amount: Number(p.total_amount), room_id: p.room_id, room_ids: p.room_ids },
          ...(rest ?? []).map((r: BookingRow) => ({ ...r, total_amount: Number(r.total_amount) })),
        ]
        setRows(allBookings.map(b => ({ id: b.id, total_amount: b.total_amount })))

        // Collect all physical room IDs
        const allRoomIds = Array.from(new Set(
          allBookings.flatMap(b => b.room_ids?.length ? b.room_ids : [b.room_id]).filter(Boolean)
        ))
        setRoomIds(allRoomIds)
      }
      setFetching(false)
    })
  }, [primaryId, ids])

  // Live availability check — fires whenever the user picks a new date
  useEffect(() => {
    if (!newCheckOut || newCheckOut <= checkOut || roomIds.length === 0) {
      setConflictingRooms([])
      return
    }
    setChecking(true)
    const supabase = createClient()
    supabase
      .from('bookings')
      .select('id, room_id, room_ids')
      .neq('status', 'cancelled')
      .neq('status', 'checked_out')
      .neq('status', 'no_show')
      .lt('check_in', newCheckOut)   // other booking starts before our new checkout
      .gt('check_out', checkOut)     // other booking ends after our current checkout
      .then(({ data }) => {
        // Find which of our rooms are claimed by another booking
        const taken = new Set<string>()
        ;(data ?? [])
          .filter(b => !ids.includes((b as { id: string }).id))
          .forEach(b => {
            const bRooms = ((b as { room_ids?: string[] | null; room_id?: string }).room_ids?.length
              ? (b as { room_ids: string[] }).room_ids
              : [(b as { room_id: string }).room_id]
            ) as string[]
            bRooms.forEach(rid => { if (roomIds.includes(rid)) taken.add(rid) })
          })
        setConflictingRooms([...taken])
        setChecking(false)
      })
  }, [newCheckOut, checkOut, roomIds, ids])

  function daysBetween(from: string, to: string) {
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
  }

  const originalNights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0
  const extraNights    = newCheckOut > checkOut ? daysBetween(checkOut, newCheckOut) : 0
  const pricePerNightPerRoom = originalNights > 0 ? (rows[0]?.total_amount ?? 0) / originalNights : 0
  const totalExtraCost = rows.reduce((s, r) => {
    const rate = originalNights > 0 ? r.total_amount / originalNights : 0
    return s + Math.round(rate * extraNights * 100) / 100
  }, 0)

  const hasConflict = conflictingRooms.length > 0
  const canSubmit   = extraNights > 0 && !submitting && !checking && !hasConflict

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    const supabase = createClient()

    const updates = rows.map(r => {
      const rate     = originalNights > 0 ? r.total_amount / originalNights : 0
      const newTotal = Math.round((r.total_amount + rate * extraNights) * 100) / 100
      return supabase.from('bookings').update({ check_out: newCheckOut, total_amount: newTotal }).eq('id', r.id)
    })

    const results = await Promise.all(updates)
    const failed  = results.find(r => r.error)
    if (failed?.error) {
      toast.error(failed.error.message)
      setSubmitting(false)
      return
    }

    const roomLabel = rows.length > 1 ? ` (${rows.length} rooms)` : ''
    toast.success(`Stay extended by ${extraNights} night${extraNights !== 1 ? 's' : ''}${roomLabel} — new check-out: ${newCheckOut}`)
    onClose()
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6">
        <button onClick={onClose} disabled={submitting} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <CalendarPlus className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Extend Stay</h3>
            <p className="text-xs text-gray-500">
              {rows.length > 1 ? `All ${rows.length} rooms will be extended` : 'Choose a new check-out date'}
            </p>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-xs text-gray-500 mb-0.5">Current check-out</p>
              <p className="font-semibold text-gray-900">{checkOut}</p>
              {originalNights > 0 && pricePerNightPerRoom > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {originalNights} night{originalNights !== 1 ? 's' : ''} · {formatCurrency(pricePerNightPerRoom, currency)}/night{rows.length > 1 ? ' per room' : ''}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">New Check-out Date</label>
              <input
                type="date"
                min={checkOut}
                value={newCheckOut}
                onChange={e => setNewCheckOut(e.target.value)}
                className={`input ${hasConflict ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {/* Availability feedback */}
              {checking && extraNights > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
                </p>
              )}
              {!checking && hasConflict && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {conflictingRooms.length === 1
                    ? 'That room is already booked for some of those dates. Choose an earlier date.'
                    : `${conflictingRooms.length} rooms are already booked for some of those dates. Choose an earlier date.`}
                </p>
              )}
              {!checking && !hasConflict && extraNights > 0 && (
                <p className="text-xs text-emerald-600 mt-1.5">✓ Room{rows.length > 1 ? 's are' : ' is'} available for the extension</p>
              )}
            </div>

            {!hasConflict && extraNights > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm">
                <p className="text-indigo-700 font-semibold">
                  +{extraNights} night{extraNights !== 1 ? 's' : ''}{rows.length > 1 ? ` × ${rows.length} rooms` : ''} · +{formatCurrency(totalExtraCost, currency)}
                </p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  Added to bill — collect the extra {formatCurrency(totalExtraCost, currency)} at checkout
                </p>
              </div>
            )}
            {newCheckOut && newCheckOut <= checkOut && (
              <p className="text-xs text-red-500">New date must be after the current check-out ({checkOut}).</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={submit} disabled={!canSubmit}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                {submitting ? 'Extending…' : 'Extend Stay'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add Extra Charges Modal ───────────────────────────────────────────────
// Adds a charge (room service, minibar, etc.) to the booking bill.
// The extra amount is collected at checkout.

const CHARGE_PRESETS = ['Room Service', 'Minibar', 'Laundry', 'Spa', 'Restaurant', 'Parking', 'Telephone', 'Other']

function AddChargesModal({
  bookingId, onClose, onSuccess,
}: {
  bookingId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [currency,    setCurrency]   = useState('USD')
  const [description, setDescription] = useState('')
  const [amount,      setAmount]     = useState('')
  const [submitting,  setSubmitting] = useState(false)

  useEffect(() => {
    createClient()
      .from('bookings')
      .select('hotel:hotels(currency)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        setCurrency((data as { hotel?: { currency?: string } | null } | null)?.hotel?.currency ?? 'USD')
      })
  }, [bookingId])

  const chargeAmount = parseFloat(amount) || 0
  const isValid = chargeAmount > 0 && description.trim().length > 0

  const submit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    const supabase = createClient()

    const { data: bk } = await supabase.from('bookings').select('total_amount').eq('id', bookingId).single()
    const currentTotal = Number((bk as { total_amount?: number } | null)?.total_amount ?? 0)
    const newTotal = Math.round((currentTotal + chargeAmount) * 100) / 100

    const { error } = await supabase.from('bookings').update({ total_amount: newTotal }).eq('id', bookingId)
    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success(`${formatCurrency(chargeAmount, currency)} added for "${description.trim()}" — collect at checkout`)
    onClose()
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-6">
        <button onClick={onClose} disabled={submitting} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Add Extra Charges</h3>
            <p className="text-xs text-gray-500">Added to the bill, collected at checkout</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Charge Type</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CHARGE_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => setDescription(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    description === p
                      ? 'bg-amber-100 border-amber-400 text-amber-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Or type a description…"
              maxLength={80}
              className="input text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{currency}</span>
              <input
                type="number" min="0.01" step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-16"
              />
            </div>
          </div>

          {isValid && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
              <p className="text-amber-800 font-medium">{formatCurrency(chargeAmount, currency)} for &quot;{description.trim()}&quot;</p>
              <p className="text-xs text-amber-600 mt-0.5">Added to the bill — collect at checkout.</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
              Cancel
            </button>
            <button onClick={submit} disabled={!isValid || submitting}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {submitting ? 'Adding…' : 'Add Charge'}
            </button>
          </div>
        </div>
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
  const [showCancelModal,   setShowCancelModal]   = useState(false)
  const [showRefundModal,   setShowRefundModal]   = useState(false)
  const [showExtendModal,   setShowExtendModal]   = useState(false)
  const [showChargesModal,  setShowChargesModal]  = useState(false)
  const [paymentBlock,      setPaymentBlock]      = useState<PaymentBlock | null>(null)
  const [closeMenu,         setCloseMenu]         = useState<(() => void) | null>(null)
  const [lateCheckout,      setLateCheckout]      = useState<LateCheckoutInfo | null>(null)
  const [lateConfirming,    setLateConfirming]    = useState(false)

  const ids    = bookingIds?.length ? bookingIds : bookingId ? [bookingId] : []
  const many   = ids.length > 1
  const suffix = many ? ` · ${ids.length} rooms` : ''

  const updateStatus = async (status: string, close: () => void) => {
    if (status === 'cancelled') {
      setCloseMenu(() => close)
      setShowCancelModal(true)
      return
    }

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

    // Block check-in if the date has already passed — UNLESS this is a late-arrival
    // override from a no-show (the whole point of Override Check-In is that they're arriving late).
    if (status === 'checked_in' && checkIn && currentStatus !== 'no_show') {
      const today = new Date().toISOString().slice(0, 10)
      if (checkIn < today) {
        toast.error(`Check-in date (${checkIn}) has already passed. Please mark this booking as "No Show" instead.`)
        close()
        return
      }
    }

    if (status === 'checked_in') {
      const { data: completed } = await supabase
        .from('payments').select('id').in('booking_id', ids).eq('status', 'completed').limit(1)

      if (!completed || completed.length === 0) {
        close()
        setPaymentBlock({ primaryId: bookingId ?? ids[0], targetStatus: 'checked_in' })
        return
      }
    }

    if (status === 'checked_out') {
      const primaryId = bookingId ?? ids[0]

      // ── Late-checkout detection ────────────────────────────────────────
      const [{ data: bookingRow }, { data: completedPayments }] = await Promise.all([
        supabase
          .from('bookings')
          .select('total_amount, check_in, check_out, hotel_id, hotel:hotels(currency, late_checkout_cutoff_time, late_checkout_half_day_pct)')
          .eq('id', primaryId)
          .single(),
        supabase.from('payments').select('amount').in('booking_id', ids).eq('status', 'completed'),
      ])

      const totalAmount  = Number(bookingRow?.total_amount ?? 0)
      const totalPaid    = (completedPayments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
      const checkOutDate = bookingRow?.check_out   // YYYY-MM-DD
      const checkInDate  = bookingRow?.check_in    // YYYY-MM-DD
      const hotel        = bookingRow?.hotel as { currency?: string; late_checkout_cutoff_time?: string; late_checkout_half_day_pct?: number } | null
      const currency     = hotel?.currency ?? 'USD'
      const cutoffTime   = hotel?.late_checkout_cutoff_time ?? '14:00:00'
      const halfDayPct   = hotel?.late_checkout_half_day_pct ?? 50

      if (checkOutDate && checkInDate) {
        const todayStr  = new Date().toISOString().slice(0, 10)
        const nowHHMM   = new Date().toTimeString().slice(0, 8) // HH:MM:SS

        const msPerDay   = 86_400_000
        const scheduled  = new Date(checkOutDate).getTime()
        const todayMs    = new Date(todayStr).getTime()
        const extraDays  = Math.round((todayMs - scheduled) / msPerDay)

        if (extraDays > 0) {
          const originalNights = Math.round(
            (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / msPerDay,
          )
          const nightRate  = originalNights > 0 ? totalAmount / originalNights : totalAmount
          const isHalfDay  = nowHHMM < cutoffTime
          const chargeType = isHalfDay ? 'half_day' as const : 'full_night' as const

          const lastDayCharge = isHalfDay
            ? nightRate * (halfDayPct / 100)
            : nightRate
          const fullNightsBefore = extraDays - 1
          const lateCharge = Math.round((fullNightsBefore * nightRate + lastDayCharge) * 100) / 100

          close()
          setLateCheckout({
            bookingId:         primaryId,
            scheduledCheckout: checkOutDate,
            extraDays,
            chargeType,
            nightRate:         Math.round(nightRate * 100) / 100,
            lateCharge,
            originalAmount:    totalAmount,
            paidAmount:        totalPaid,
            currency,
            halfDayPct,
            cutoffTime:        cutoffTime.slice(0, 5), // HH:MM
          })
          return
        }
      }

      // ── Normal balance check ───────────────────────────────────────────
      const outstanding = Math.round((totalAmount - totalPaid) * 100) / 100
      if (outstanding > 0) {
        close()
        setPaymentBlock({ primaryId, targetStatus: 'checked_out' })
        return
      }
    }

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

    const isLateArrivalOverride = currentStatus === 'no_show' && status === 'checked_in'
    const label = isLateArrivalOverride
      ? `Late arrival override — guest checked in`
      : `Booking ${status.replace('_', ' ')}`
    toast.success(`${label}${suffix}`)

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

  const showRecordPayment = ['pending', 'confirmed', 'checked_in'].includes(currentStatus)
  const showRefund        = currentStatus === 'no_show'
  const showExtendStay    = currentStatus === 'checked_in'
  const showAddCharges    = currentStatus === 'checked_in'

  const hasAnyAction = next.length > 0 || showRecordPayment || showRefund || showExtendStay || showAddCharges
  if (!hasAnyAction) return <span className="text-xs text-gray-400">—</span>

  const primaryId = bookingId ?? ids[0]

  return (
    <>
      <ActionMenu
        button={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
        buttonClassName="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        buttonAriaLabel="Booking actions"
      >
        {close => (
          <>
            {next.map(status => {
              const isOverride = currentStatus === 'no_show' && status === 'checked_in'
              return (
                <button key={status} role="menuitem" onClick={() => updateStatus(status, close)}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                    status === 'cancelled'  ? 'text-red-700 hover:bg-red-50'
                    : status === 'no_show' ? 'text-orange-700 hover:bg-orange-50'
                    : isOverride           ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-gray-700'
                  }`}>
                  {isOverride ? 'Override Check-In' : (ACTION_LABEL[status] ?? status.replace('_', ' '))}
                </button>
              )
            })}

            {/* Extend Stay + Add Extra Charges — checked_in only */}
            {(showExtendStay || showAddCharges) && (
              <>
                <div className="border-t border-gray-100 my-1" />
                {showExtendStay && (
                  <button role="menuitem"
                    onClick={() => { close(); setShowExtendModal(true) }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-indigo-700 hover:bg-indigo-50">
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Extend Stay
                  </button>
                )}
                {showAddCharges && (
                  <button role="menuitem"
                    onClick={() => { close(); setShowChargesModal(true) }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-amber-700 hover:bg-amber-50">
                    <Receipt className="h-3.5 w-3.5" />
                    Add Extra Charges
                  </button>
                )}
              </>
            )}

            {/* Refund — no-show only */}
            {showRefund && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button role="menuitem"
                  onClick={() => { close(); setShowRefundModal(true) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-50">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Refund
                </button>
              </>
            )}

            {/* Record Payment */}
            {showRecordPayment && (
              <>
                {(next.length > 0 || showExtendStay || showAddCharges) && <div className="border-t border-gray-100 my-1" />}
                <button role="menuitem"
                  onClick={() => { close(); setPaymentBlock({ primaryId, targetStatus: 'record' }) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-emerald-700 hover:bg-emerald-50">
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

      {showRefundModal && (
        <RefundModal
          bookingId={primaryId}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => { setShowRefundModal(false); router.refresh() }}
        />
      )}

      {showExtendModal && (
        <ExtendStayModal
          ids={ids}
          onClose={() => setShowExtendModal(false)}
          onSuccess={() => { setShowExtendModal(false); onStatusChange?.(currentStatus); router.refresh() }}
        />
      )}

      {showChargesModal && (
        <AddChargesModal
          bookingId={primaryId}
          onClose={() => setShowChargesModal(false)}
          onSuccess={() => { setShowChargesModal(false); router.refresh() }}
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

      {lateCheckout && (
        <LateCheckoutModal
          info={lateCheckout}
          confirming={lateConfirming}
          onClose={() => setLateCheckout(null)}
          onConfirm={async () => {
            setLateConfirming(true)
            try {
              const supabase = createClient()
              const newTotal = lateCheckout.originalAmount + lateCheckout.lateCharge

              // Apply the late charge by updating total_amount
              const { error } = await supabase
                .from('bookings')
                .update({ total_amount: newTotal })
                .eq('id', lateCheckout.bookingId)
              if (error) { toast.error(error.message); return }

              const newBalance = Math.round((newTotal - lateCheckout.paidAmount) * 100) / 100
              setLateCheckout(null)

              if (newBalance > 0) {
                // Still has outstanding — open payment modal with updated total
                setPaymentBlock({ primaryId: lateCheckout.bookingId, targetStatus: 'checked_out' })
              } else {
                // Fully paid — proceed to checkout directly
                const { data: bk } = await supabase
                  .from('bookings').select('room_id, room_ids').eq('id', lateCheckout.bookingId).single()
                const roomIds = Array.from(new Set([
                  ...(bk?.room_ids?.length ? bk.room_ids : [bk?.room_id]),
                ].filter(Boolean)))
                if (roomIds.length) {
                  await supabase.from('rooms').update({ status: 'cleaning' }).in('id', roomIds)
                }
                await supabase.from('bookings').update({ status: 'checked_out' }).eq('id', lateCheckout.bookingId)
                toast.success('Guest checked out — late charge applied')
                onStatusChange?.('checked_out')
                router.refresh()
              }
            } finally {
              setLateConfirming(false)
            }
          }}
        />
      )}
    </>
  )
}
