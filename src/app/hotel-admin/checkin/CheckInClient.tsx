'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LogIn, LogOut, BedDouble, Calendar, Loader2 } from 'lucide-react'
import type { BookingEntry } from './page'

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
}: {
  booking: BookingEntry
  mode: 'check_in' | 'check_out' | 'upcoming'
  loadingId: string | null
  onAction: (id: string, a: 'check_in' | 'check_out') => void
}) {
  const busy = loadingId === booking.id
  const n = nights(booking.check_in, booking.check_out)

  return (
    <div className="px-4 py-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/60 transition-colors bg-white">
      <div className="flex gap-3">
        <Avatar name={booking.userName} avatarUrl={booking.userAvatar} />

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {booking.userName}
            </p>

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
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-60"
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
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Fixed header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-50">
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
export default function CheckInClient({ arrivals, inHouse, upcoming, departuresToday }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const doAction = async (bookingId: string, action: 'check_in' | 'check_out') => {
    setLoadingId(bookingId)
    const supabase = createClient()

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
    /*
     * h-full fills the <main> flex-1 area.
     * flex-col + min-h-0 lets the kanban grid shrink and scroll internally
     * instead of pushing the page taller.
     * On mobile we fall back to natural scroll (remove h-full).
     */
    <div className="flex flex-col lg:h-full">

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
            <LogOut className="h-3.5 w-3.5" />
            {departuresToday} departing
          </span>
        </div>
      </div>

      {/* ── Kanban board — fills remaining height ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">

        <Column
          icon={LogIn}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
          title="Today's Arrivals"
          subtitle="Check-in from 3:00 PM"
          count={arrivals.length}
          countCls="text-primary-700 bg-primary-50"
          emptyIcon={LogIn}
          emptyText="No arrivals today"
        >
          {arrivals.map(b => (
            <BookingCard key={b.id} booking={b} mode="check_in" loadingId={loadingId} onAction={doAction} />
          ))}
        </Column>

        <Column
          icon={BedDouble}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          title="In-House Guests"
          subtitle="Check-out by 12:00 PM"
          count={inHouse.length}
          countCls="text-teal-700 bg-teal-50"
          emptyIcon={BedDouble}
          emptyText="No guests currently in-house"
        >
          {inHouse.map(b => (
            <BookingCard key={b.id} booking={b} mode="check_out" loadingId={loadingId} onAction={doAction} />
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
  )
}
