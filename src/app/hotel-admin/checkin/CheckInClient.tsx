'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LogIn, LogOut, BedDouble, Calendar, Loader2, AlertTriangle, X, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import type { BookingEntry } from './page'
import { InlinePaymentModal } from '@/components/admin/InlinePaymentModal'

// Warm palette — matches guest directory & reports
const WARM_COLORS = [
  '#D97706', '#B45309', '#F59E0B', '#92400E',
  '#0D9488', '#C2410C', '#059669', '#7C3AED',
  '#DC2626', '#0891B2',
]

function avatarHex(seed: string): string {
  if (!seed) return WARM_COLORS[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % WARM_COLORS.length
  return WARM_COLORS[h]
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000)
}

function bookingRef(id: string) {
  return `BK-${id.slice(0, 4).toUpperCase()}`
}

interface Props {
  arrivals: BookingEntry[]
  inHouse: BookingEntry[]
  upcoming: BookingEntry[]
  departuresToday: number
  today: string
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden select-none"
      style={{ backgroundColor: avatarUrl ? undefined : avatarHex(name) }}
    >
      {avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        : initials(name)}
    </div>
  )
}

// ── Single booking card ────────────────────────────────────────────────────
function BookingCard({
  booking,
  mode,
  loadingId,
  onAction,
  today,
}: {
  booking: BookingEntry
  mode: 'check_in' | 'check_out' | 'upcoming'
  loadingId: string | null
  onAction: (id: string, a: 'check_in' | 'check_out') => void
  today?: string
}) {
  const busy = loadingId === booking.id
  const n = nights(booking.check_in, booking.check_out)

  const daysOverdue = today && mode === 'check_out' && booking.check_out < today
    ? Math.round((new Date(today).getTime() - new Date(booking.check_out + 'T00:00:00').getTime()) / 86_400_000)
    : 0
  const departingToday = today && mode === 'check_out' && booking.check_out === today

  const cardBorder = daysOverdue > 0
    ? 'border-red-200 bg-red-50/40 hover:bg-red-50/70'
    : departingToday
      ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/60'

  return (
    <div className={`px-4 py-3.5 rounded-xl border transition-colors bg-white ${cardBorder}`}>
      <div className="flex gap-3">
        <Avatar name={booking.userName} avatarUrl={booking.userAvatar} />

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                {booking.userName}
              </p>
              {daysOverdue > 0 && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                  <AlertCircle className="h-3 w-3" />
                  {daysOverdue}d overdue
                </span>
              )}
              {departingToday && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                  <Clock className="h-3 w-3" />
                  Today
                </span>
              )}
            </div>

            {mode === 'check_in' && (
              <button
                onClick={() => onAction(booking.id, 'check_in')}
                disabled={busy}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-primary-200/60"
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                Check In
              </button>
            )}

            {mode === 'check_out' && (
              <button
                onClick={() => onAction(booking.id, 'check_out')}
                disabled={busy}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                  daysOverdue > 0
                    ? 'border border-red-300 bg-red-600 hover:bg-red-700 text-white'
                    : 'border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                Check Out
              </button>
            )}

            {mode === 'upcoming' && (
              <span className="flex-shrink-0 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wide uppercase">
                Confirmed
              </span>
            )}
          </div>

          {/* Room info */}
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Room {booking.roomNumber}
            {booking.roomTypeName ? ` · ${booking.roomTypeName}` : ''}
            {' · '}{n} night{n !== 1 ? 's' : ''}
          </p>

          {/* Dates + ref */}
          <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
            {fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}
            <span className="mx-1">·</span>
            <span className="font-mono tracking-tight">{bookingRef(booking.id)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Column ─────────────────────────────────────────────────────────────────
function Column({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  count,
  countCls,
  emptyIcon: EmptyIcon,
  emptyText,
  filterBar,
  children,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  count: number
  countCls: string
  emptyIcon: React.ElementType
  emptyText: string
  filterBar?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      {/* Fixed header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
            <p className="text-[11px] text-gray-400">{subtitle}</p>
          </div>
          <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${countCls}`}>
            {count}
          </span>
        </div>
        {filterBar && (
          <div className="flex items-center gap-1 flex-wrap mt-2.5 pt-2.5 border-t border-gray-50">
            {filterBar}
          </div>
        )}
      </div>

      {/* Scrollable body — fills remaining column height */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[180px] py-12 px-5 text-center">
            <EmptyIcon className="h-9 w-9 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">{emptyText}</p>
          </div>
        ) : children}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
type PaymentBlock = {
  bookingId: string
  guestName: string
  pendingAmount: number
  currency: string
  action: 'check_in' | 'check_out'
}

type InHouseFilter  = 'all' | 'today' | 'overdue' | 'staying'
type ArrivalFilter  = 'today' | 'upcoming' | 'all'

export default function CheckInClient({ arrivals, inHouse, upcoming, departuresToday, today }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId]         = useState<string | null>(null)
  const [paymentBlock, setPaymentBlock]   = useState<PaymentBlock | null>(null)
  const [inHouseFilter, setInHouseFilter] = useState<InHouseFilter>('all')
  const [arrivalFilter, setArrivalFilter] = useState<ArrivalFilter>('today')

  const overdueGuests  = inHouse.filter(b => b.check_out < today)
  const departingToday = inHouse.filter(b => b.check_out === today)
  const stayingGuests  = inHouse.filter(b => b.check_out > today)
  const overdueCount   = overdueGuests.length
  const departingCount = departingToday.length

  // Apply arrival filter — merges today's arrivals and upcoming as needed
  const filteredArrivals = (() => {
    if (arrivalFilter === 'today')    return arrivals
    if (arrivalFilter === 'upcoming') return upcoming
    return [...arrivals, ...upcoming].sort((a, b) => a.check_in.localeCompare(b.check_in))
  })()

  // Apply selected filter to the in-house list
  const filteredInHouse = (() => {
    const base =
      inHouseFilter === 'today'   ? departingToday :
      inHouseFilter === 'overdue' ? overdueGuests  :
      inHouseFilter === 'staying' ? stayingGuests  :
      inHouse
    // Sort: overdue first → departing today → rest
    return [...base].sort((a, b) => {
      const urgency = (x: BookingEntry) =>
        x.check_out < today ? 2 : x.check_out === today ? 1 : 0
      return urgency(b) - urgency(a)
    })
  })()

  // Insert overdue / departing-today notifications into the bell (once per day)
  useEffect(() => {
    if (overdueCount > 0 || departingCount > 0) {
      fetch('/api/admin/notifications/checkin', { method: 'POST' }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doAction = async (bookingId: string, action: 'check_in' | 'check_out') => {
    setLoadingId(bookingId)
    const supabase = createClient()

    // ── Check-in: block if no payment has been collected ────────────────
    if (action === 'check_in') {
      const { data: pending } = await supabase
        .from('payments')
        .select('amount, currency')
        .eq('booking_id', bookingId)
        .eq('status', 'pending')

      if (pending && pending.length > 0) {
        const { data: completed } = await supabase
          .from('payments')
          .select('id')
          .eq('booking_id', bookingId)
          .eq('status', 'completed')
          .limit(1)

        if (!completed || completed.length === 0) {
          const total    = pending.reduce((s, p) => s + (p.amount ?? 0), 0)
          const currency = pending[0]?.currency ?? ''
          const guest    = arrivals.find(b => b.id === bookingId)
          setPaymentBlock({
            bookingId,
            guestName:     guest?.userName ?? 'this guest',
            pendingAmount: total,
            currency,
            action:        'check_in',
          })
          setLoadingId(null)
          return
        }
      }
    }

    // ── Checkout: block if any payment is still pending ──────────────────
    if (action === 'check_out') {
      const { data: pending } = await supabase
        .from('payments')
        .select('amount, currency')
        .eq('booking_id', bookingId)
        .eq('status', 'pending')

      if (pending && pending.length > 0) {
        const total    = pending.reduce((s, p) => s + (p.amount ?? 0), 0)
        const currency = pending[0]?.currency ?? ''
        const guest    = inHouse.find(b => b.id === bookingId)
        setPaymentBlock({
          bookingId,
          guestName:     guest?.userName ?? 'this guest',
          pendingAmount: total,
          currency,
          action:        'check_out',
        })
        setLoadingId(null)
        return
      }
    }

    const { data: booking } = await supabase
      .from('bookings').select('room_id').eq('id', bookingId).single()

    if (booking?.room_id) {
      await supabase.from('rooms').update({
        status: action === 'check_in' ? 'booked' : 'cleaning',
      }).eq('id', booking.room_id)
    }

    const { error } = await supabase
      .from('bookings').update({
        status: action === 'check_in' ? 'checked_in' : 'checked_out',
      }).eq('id', bookingId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(
        action === 'check_in'
          ? 'Guest checked in!'
          : 'Guest checked out. Room queued for cleaning.'
      )
      router.refresh()
    }
    setLoadingId(null)
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
    <div className="flex flex-col">

      {/* ── Compact page header ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-In / Out</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Arrivals, in-house guests & departures · {dateLabel}
          </p>
        </div>

        {/* Quick stat pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
            <LogIn className="h-3.5 w-3.5" />
            {arrivals.length} arriving
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
            <BedDouble className="h-3.5 w-3.5" />
            {inHouse.length} in-house
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
            <LogOut className="h-3.5 w-3.5" />
            {departuresToday} departing today
          </span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>


      {/* ── Kanban board — viewport height minus header + page-header offset ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100dvh-14rem)]">

        <Column
          icon={LogIn}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
          title={
            arrivalFilter === 'upcoming' ? 'Upcoming Arrivals' :
            arrivalFilter === 'all'      ? 'All Arrivals'      :
            "Today's Arrivals"
          }
          subtitle={
            arrivalFilter === 'upcoming' ? 'Next confirmed reservations' :
            arrivalFilter === 'all'      ? 'Today + upcoming'            :
            'Check-in from 3:00 PM'
          }
          count={filteredArrivals.length}
          countCls="text-primary-700 bg-primary-50"
          emptyIcon={LogIn}
          emptyText={
            arrivalFilter === 'upcoming' ? 'No upcoming arrivals' :
            arrivalFilter === 'all'      ? 'No pending arrivals'  :
            'No arrivals today'
          }
          filterBar={
            <>
              {([
                { key: 'today',    label: 'Today',    count: arrivals.length,                   cls: 'text-primary-600 bg-primary-50',  active: 'bg-primary-600 text-white'  },
                { key: 'upcoming', label: 'Upcoming', count: upcoming.length,                   cls: 'text-blue-600 bg-blue-50',        active: 'bg-blue-600 text-white'     },
                { key: 'all',      label: 'All',      count: arrivals.length + upcoming.length, cls: 'text-gray-500 bg-gray-100',       active: 'bg-gray-600 text-white'     },
              ] as { key: ArrivalFilter; label: string; count: number; cls: string; active: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setArrivalFilter(f.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    arrivalFilter === f.key ? f.active : `${f.cls} hover:opacity-70`
                  }`}
                >
                  {f.label} <span className="opacity-70">{f.count}</span>
                </button>
              ))}
            </>
          }
        >
          {filteredArrivals.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              mode={b.check_in === today ? 'check_in' : 'upcoming'}
              loadingId={loadingId}
              onAction={doAction}
            />
          ))}
        </Column>

        <Column
          icon={
            inHouseFilter === 'today'   ? LogOut      :
            inHouseFilter === 'overdue' ? AlertCircle :
            BedDouble
          }
          iconBg={
            inHouseFilter === 'today'   ? 'bg-amber-50' :
            inHouseFilter === 'overdue' ? 'bg-red-50'   :
            'bg-teal-50'
          }
          iconColor={
            inHouseFilter === 'today'   ? 'text-amber-500' :
            inHouseFilter === 'overdue' ? 'text-red-600'   :
            'text-teal-600'
          }
          title={
            inHouseFilter === 'today'   ? "Today's Checkouts"  :
            inHouseFilter === 'overdue' ? 'Overdue Checkouts'  :
            inHouseFilter === 'staying' ? 'Still Staying'      :
            'In-House Guests'
          }
          subtitle={
            inHouseFilter === 'today'   ? 'Check-out by 12:00 PM'      :
            inHouseFilter === 'overdue' ? 'Checkout date has passed'    :
            inHouseFilter === 'staying' ? 'Checking out in coming days' :
            'Check-out by 12:00 PM'
          }
          count={filteredInHouse.length}
          countCls={
            inHouseFilter === 'today'   ? 'text-amber-700 bg-amber-100' :
            inHouseFilter === 'overdue' ? 'text-red-700 bg-red-100'     :
            overdueCount > 0 && inHouseFilter === 'all' ? 'text-red-700 bg-red-100' :
            'text-teal-700 bg-teal-50'
          }
          emptyIcon={BedDouble}
          emptyText={
            inHouseFilter === 'today'   ? 'No checkouts today'            :
            inHouseFilter === 'overdue' ? 'No overdue checkouts'          :
            inHouseFilter === 'staying' ? 'No guests staying beyond today' :
            'No guests currently in-house'
          }
          filterBar={
            <>
              {([
                { key: 'all',     label: 'All',      count: inHouse.length,       cls: 'text-teal-600 bg-teal-50',   active: 'bg-teal-600 text-white'   },
                { key: 'today',   label: 'Checkout', count: departingCount,       cls: 'text-amber-600 bg-amber-50', active: 'bg-amber-500 text-white'  },
                { key: 'overdue', label: 'Overdue',  count: overdueCount,         cls: 'text-red-600 bg-red-50',     active: 'bg-red-600 text-white'    },
                { key: 'staying', label: 'Staying',  count: stayingGuests.length, cls: 'text-gray-500 bg-gray-100',  active: 'bg-gray-600 text-white'   },
              ] as { key: InHouseFilter; label: string; count: number; cls: string; active: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setInHouseFilter(f.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    inHouseFilter === f.key ? f.active : `${f.cls} hover:opacity-70`
                  } ${f.key === 'overdue' && overdueCount > 0 && inHouseFilter !== 'overdue' ? 'animate-pulse' : ''}`}
                >
                  {f.label} <span className="opacity-70">{f.count}</span>
                </button>
              ))}
            </>
          }
        >
          {filteredInHouse.map(b => (
            <BookingCard key={b.id} booking={b} mode="check_out" loadingId={loadingId} onAction={doAction} today={today} />
          ))}
        </Column>

        <Column
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Upcoming Arrivals"
          subtitle="Next confirmed reservations"
          count={upcoming.length}
          countCls="text-blue-700 bg-blue-50"
          emptyIcon={Calendar}
          emptyText="No upcoming arrivals"
        >
          {upcoming.map(b => (
            <BookingCard key={b.id} booking={b} mode="upcoming" loadingId={loadingId} onAction={doAction} />
          ))}
        </Column>

      </div>
    </div>

    {/* ── Pending-payment block modal ── */}
    {paymentBlock && paymentBlock.action === 'check_out' && (
      <InlinePaymentModal
        block={{ primaryId: paymentBlock.bookingId, targetStatus: 'checked_out' }}
        bookingStatus="checked_in"
        onClose={() => setPaymentBlock(null)}
        onSuccess={() => { setPaymentBlock(null); router.refresh() }}
      />
    )}

    {paymentBlock && paymentBlock.action === 'check_in' && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-11 w-11 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base">Pending Payment</h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                <span className="font-semibold text-gray-900">{paymentBlock.guestName}</span> has
                an outstanding balance of{' '}
                <span className="font-bold text-red-600">
                  {paymentBlock.currency} {paymentBlock.pendingAmount.toLocaleString()}
                </span>.
                <br />
                Please record the payment before checking in.
              </p>
            </div>
            <button
              onClick={() => setPaymentBlock(null)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setPaymentBlock(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <Link
              href={`/hotel-admin/payments?booking=${paymentBlock.bookingId}`}
              onClick={() => setPaymentBlock(null)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-center text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
            >
              Record Payment
            </Link>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
