'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar, Check, MapPin, Star, X, PhoneCall,
  BedDouble, Loader2, CheckCircle2, XCircle,
  MoonStar, Search, ChevronDown, SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────
type Payment = { status?: string; amount?: number; payment_method?: string }
type Hotel   = { name?: string; city?: string; country?: string }
type Room    = { room_number?: string; room_type?: { name?: string } }
type Review  = { id: string; rating: number; comment: string }
type Booking = {
  id: string
  hotel_id: string
  status: string
  check_in: string
  check_out: string
  adults: number
  children: number
  total_amount: number
  created_at: string
  hotel: Hotel
  room: Room
  payment: Payment | Payment[]
  review?: Review | Review[] | null
}

// ─── Constants ────────────────────────────────────────────────────────
const TABS = [
  { key: 'upcoming',  label: 'Upcoming',  statuses: ['pending', 'confirmed', 'checked_in'] },
  { key: 'completed', label: 'Completed', statuses: ['checked_out'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
] as const
type TabKey = (typeof TABS)[number]['key']

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  confirmed:   'Confirmed',
  checked_in:  'Checked In',
  checked_out: 'Completed',
  cancelled:   'Cancelled',
}
const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-amber-100  text-amber-700  border-amber-200',
  confirmed:   'bg-blue-100   text-blue-700   border-blue-200',
  checked_in:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  checked_out: 'bg-teal-100   text-teal-700   border-teal-200',
  cancelled:   'bg-red-100    text-red-500    border-red-200',
}
const PAYMENT_BADGE: Record<string, string> = {
  pending:   'bg-amber-50  text-amber-600',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-red-50    text-red-600',
  refunded:  'bg-gray-100  text-gray-500',
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Helpers ─────────────────────────────────────────────────────────
function nights(ci: string, co: string) {
  return Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))
}
function resolvePayment(raw: Payment | Payment[] | undefined) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.find(p => p.status === 'completed') ?? list[0]
}
function resolveReview(raw: Review | Review[] | undefined | null) {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

// ─── Confirm Cancel Modal ─────────────────────────────────────────────
function ConfirmCancelModal({
  booking, cancelling, onConfirm, onDismiss,
}: {
  booking: Booking
  cancelling: boolean
  onConfirm: () => void
  onDismiss: () => void
}) {
  const n = nights(booking.check_in, booking.check_out)
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-red-50 px-6 pt-6 pb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Cancel Booking?</h3>
          <p className="text-sm text-gray-500 mt-1">
            This will cancel your booking at{' '}
            <span className="font-semibold text-gray-700">{booking.hotel?.name}</span>.
          </p>
        </div>

        {/* Booking summary */}
        <div className="px-6 py-4 space-y-2 border-b border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Check-in</span>
            <span className="font-medium text-gray-800">{fmt(booking.check_in)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Check-out</span>
            <span className="font-medium text-gray-800">{fmt(booking.check_out)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Duration</span>
            <span className="font-medium text-gray-800">{n} night{n !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total</span>
            <span className="font-bold text-gray-900">Rs {Number(booking.total_amount).toLocaleString()}</span>
          </div>
        </div>

        <div className="px-6 py-3">
          <p className="text-xs text-gray-400 text-center">This action cannot be undone.</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={cancelling}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────
function BookingCard({
  booking, cancellingId, reviewingId, reviewState,
  onCancel, onRating, onComment, onSubmitReview,
}: {
  booking: Booking
  cancellingId: string | null
  reviewingId: string | null
  reviewState: Record<string, { rating: number; comment: string }>
  onCancel: (id: string) => void
  onRating: (id: string, r: number) => void
  onComment: (id: string, c: string) => void
  onSubmitReview: (id: string) => void
}) {
  const { id, status, check_in, check_out, adults, children, total_amount, hotel, room, payment } = booking
  const n          = nights(check_in, check_out)
  const pay        = resolvePayment(payment)
  const payStatus  = pay?.status ?? 'pending'
  const review     = resolveReview(booking.review)
  const rev        = reviewState[id] ?? { rating: 5, comment: '' }
  const isCancelled = status === 'cancelled'
  const isCompleted = status === 'checked_out'
  const badge       = STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${isCancelled ? 'border-red-100' : 'border-gray-200'}`}>

      {/* Top strip: hotel + status */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/hotels/${booking.hotel_id}`}
            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors leading-snug">
            {hotel?.name ?? '—'}
          </Link>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {hotel?.city}, {hotel?.country}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
          {status === 'pending' && (
            <button
              type="button"
              onClick={() => onCancel(id)}
              disabled={cancellingId === id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {cancellingId === id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <X className="h-3 w-3" />}
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="mx-5 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-gray-50 px-4 py-3">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> Room
          </p>
          <p className="text-sm font-medium text-gray-800 truncate">
            {room?.room_number ?? '—'}{room?.room_type?.name ? ` · ${room.room_type.name}` : ''}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Check-in
          </p>
          <p className="text-sm font-medium text-gray-800">
            {new Date(check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Check-out
          </p>
          <p className="text-sm font-medium text-gray-800">
            {new Date(check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <MoonStar className="h-3 w-3" /> Duration
          </p>
          <p className="text-sm font-medium text-gray-800">{n} night{n !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex flex-wrap items-center gap-2.5 text-xs text-gray-500">
        <span className="font-bold text-gray-900 text-sm">Rs {Number(total_amount).toLocaleString()}</span>
        <span className="text-gray-200">|</span>
        <span>Payment</span>
        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${PAYMENT_BADGE[payStatus] ?? 'bg-gray-100 text-gray-500'}`}>
          {payStatus.replace('_', ' ')}
        </span>
        {pay?.payment_method && <span className="capitalize text-gray-400">· {pay.payment_method}</span>}
        {adults > 0 && (
          <>
            <span className="text-gray-200">|</span>
            <span>{adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</span>
          </>
        )}
      </div>

      {/* Pending notice */}
      {status === 'pending' && (
        <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <PhoneCall className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting advance payment</p>
            <p className="text-xs text-amber-700 mt-0.5">Our team will contact you to collect a 50% advance. Booking confirms once received.</p>
          </div>
        </div>
      )}

      {/* Review form (completed, no review yet) */}
      {isCompleted && !review && (
        <div className="mx-5 mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> How was your stay?
          </p>
          <div className="flex items-center gap-0.5 mb-2.5">
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button" onClick={() => onRating(id, s)} className="p-0.5">
                <Star className={`h-5 w-5 transition-colors ${s <= rev.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="text" value={rev.comment} onChange={e => onComment(id, e.target.value)}
              placeholder="Tell us about your experience…" className="input text-sm flex-1" />
            <button onClick={() => onSubmitReview(id)}
              disabled={reviewingId === id || !rev.comment.trim()}
              className="btn-primary text-xs px-4 shrink-0 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              {reviewingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Review submitted */}
      {isCompleted && review && (
        <div className="mx-5 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">Your review</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
          {review.comment && <p className="text-xs text-gray-500 ml-1 truncate">{review.comment}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function CustomerBookingsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [bookings,     setBookings]     = useState<Booking[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<TabKey>('upcoming')
  const [cancellingId,       setCancellingId]       = useState<string | null>(null)
  const [confirmCancelBooking, setConfirmCancelBooking] = useState<Booking | null>(null)
  const [reviewingId,  setReviewingId]  = useState<string | null>(null)
  const [reviewState,  setReviewState]  = useState<Record<string, { rating: number; comment: string }>>({})
  const [showFilters,  setShowFilters]  = useState(false)

  // Filters
  const [searchHotel,  setSearchHotel]  = useState('')
  const [filterMonth,  setFilterMonth]  = useState('')   // 'YYYY-MM'
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [sortOrder,    setSortOrder]    = useState<'asc'|'desc'>('desc')

  const getReview  = (id: string) => reviewState[id] ?? { rating: 5, comment: '' }
  const setRating  = (id: string, r: number) => setReviewState(p => ({ ...p, [id]: { ...getReview(id), rating: r } }))
  const setComment = (id: string, c: string) => setReviewState(p => ({ ...p, [id]: { ...getReview(id), comment: c } }))

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase
      .from('bookings')
      .select('*, hotel:hotels(name, city, country), room:rooms(room_number, room_type:room_types(name)), payment:payments(status, amount, payment_method), review:reviews(id, rating, comment)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setBookings((data ?? []) as Booking[])
    setLoading(false)
  }, [router])

  useEffect(() => {
    const p = searchParams.get('payment')
    if (p === 'success')   { toast.success('Payment completed'); fetchBookings() }
    if (p === 'cancelled') { toast.error('Payment was cancelled') }
  }, [fetchBookings, searchParams])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Step 1 — show the confirm modal
  const requestCancel = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId) ?? null
    setConfirmCancelBooking(booking)
  }

  // Step 2 — user confirmed: do the actual cancellation
  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    try {
      const res  = await fetch('/api/bookings/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not cancel booking'); return }
      toast.success('Booking cancelled')
      setBookings(prev => prev.map(b => {
        if (b.id !== bookingId) return b
        const list = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : []
        return { ...b, status: 'cancelled', payment: list.map((p: Payment) => p.status === 'pending' ? { ...p, status: 'failed' } : p) }
      }))
      setConfirmCancelBooking(null)
    } catch { toast.error('Could not cancel booking') }
    finally  { setCancellingId(null) }
  }

  const handleSubmitReview = async (bookingId: string) => {
    const { rating, comment } = getReview(bookingId)
    if (!comment.trim()) return
    setReviewingId(bookingId)
    const booking = bookings.find(b => b.id === bookingId)
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, hotel_id: booking?.hotel_id ?? '', rating, comment }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Could not submit review') }
    else {
      toast.success('Review submitted!')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, review: json } : b))
      setReviewState(prev => { const n = { ...prev }; delete n[bookingId]; return n })
    }
    setReviewingId(null)
  }

  // Available months from all bookings (for the month filter chips)
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach(b => set.add(b.check_in.slice(0, 7)))
    return Array.from(set).sort()
  }, [bookings])

  // Tab counts
  const countByTab = useMemo(() => {
    const map: Record<string, number> = { upcoming: 0, completed: 0, cancelled: 0 }
    bookings.forEach(b => {
      if (['pending','confirmed','checked_in'].includes(b.status)) map.upcoming++
      else if (b.status === 'checked_out') map.completed++
      else if (b.status === 'cancelled')   map.cancelled++
    })
    return map
  }, [bookings])

  // Tab + filter pipeline
  const visibleBookings = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab)!
    let list = bookings.filter(b => (tab.statuses as readonly string[]).includes(b.status))

    if (searchHotel.trim()) {
      const q = searchHotel.toLowerCase()
      list = list.filter(b => b.hotel?.name?.toLowerCase().includes(q) || b.hotel?.city?.toLowerCase().includes(q))
    }
    if (filterMonth) {
      list = list.filter(b => b.check_in.startsWith(filterMonth))
    }
    if (filterFrom) {
      list = list.filter(b => b.check_in >= filterFrom)
    }
    if (filterTo) {
      list = list.filter(b => b.check_in <= filterTo)
    }

    list = [...list].sort((a, b) =>
      sortOrder === 'desc'
        ? new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
        : new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    )
    return list
  }, [bookings, activeTab, searchHotel, filterMonth, filterFrom, filterTo, sortOrder])

  const hasFilters = searchHotel || filterMonth || filterFrom || filterTo
  const clearFilters = () => { setSearchHotel(''); setFilterMonth(''); setFilterFrom(''); setFilterTo('') }

  const cardProps = { cancellingId, reviewingId, reviewState, onCancel: requestCancel, onRating: setRating, onComment: setComment, onSubmitReview: handleSubmitReview }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">My Bookings</h2>
            <p className="text-indigo-300 text-sm mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {countByTab.upcoming > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <Calendar className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-white font-bold leading-none">{countByTab.upcoming}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Upcoming</p>
                </div>
              </div>
            )}
            {countByTab.completed > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-white font-bold leading-none">{countByTab.completed}</p>
                  <p className="text-indigo-300 text-xs leading-none mt-0.5">Completed</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); clearFilters() }}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {countByTab[tab.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {countByTab[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {/* Search + toggle */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchHotel}
              onChange={e => setSearchHotel(e.target.value)}
              placeholder="Search by hotel or city…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || filterMonth || filterFrom || filterTo
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasFilters && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Sort</span>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'asc'|'desc')}
              className="text-sm border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-4">

            {/* Month chips */}
            {availableMonths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Month</p>
                <div className="flex flex-wrap gap-2">
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    const label = `${MONTHS[parseInt(mo) - 1]} ${y}`
                    const active = filterMonth === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFilterMonth(active ? '' : m)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date range */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Check-in Date Range</p>
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">To</label>
                  <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    min={filterFrom}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="self-end text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-2">
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Booking list ── */}
      <div className="space-y-3">
        {visibleBookings.map(b => (
          <BookingCard key={b.id} booking={b} {...cardProps} />
        ))}

        {/* Empty states */}
        {visibleBookings.length === 0 && bookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="font-semibold text-gray-800 mb-1">No bookings yet</p>
            <p className="text-sm text-gray-400 mb-5">Find a hotel and make your first booking</p>
            <Link href="/" className="btn-primary text-sm px-5">Browse Hotels</Link>
          </div>
        )}

        {visibleBookings.length === 0 && bookings.length > 0 && !hasFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 py-14 text-center">
            {activeTab === 'upcoming' && (
              <>
                <CheckCircle2 className="h-10 w-10 text-teal-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">No upcoming bookings</p>
                <p className="text-sm text-gray-400 mb-5">Ready for your next trip?</p>
                <Link href="/" className="btn-primary text-sm px-5">Find a Hotel</Link>
              </>
            )}
            {activeTab === 'completed' && (
              <>
                <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No completed stays yet</p>
                <p className="text-sm text-gray-400 mt-1">Completed stays will appear here after checkout</p>
              </>
            )}
            {activeTab === 'cancelled' && (
              <>
                <XCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No cancelled bookings</p>
                <p className="text-sm text-gray-400 mt-1">Great news — nothing cancelled!</p>
              </>
            )}
          </div>
        )}

        {visibleBookings.length === 0 && hasFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
            <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No bookings match your filters</p>
            <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Cancel Modal ── */}
      {confirmCancelBooking && (
        <ConfirmCancelModal
          booking={confirmCancelBooking}
          cancelling={cancellingId === confirmCancelBooking.id}
          onConfirm={() => handleCancel(confirmCancelBooking.id)}
          onDismiss={() => setConfirmCancelBooking(null)}
        />
      )}
    </div>
  )
}
