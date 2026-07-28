'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar, Check, MapPin, Star, X, PhoneCall,
  BedDouble, Clock, CheckCircle2, XCircle, Loader2,
  MoonStar, History,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useState } from 'react'

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
  special_requests?: string | null
  created_at: string
  hotel: Hotel
  room: Room
  payment: Payment | Payment[]
  review?: Review | null
}

// ─── Helpers ──────────────────────────────────────────────────────────
const ACTIVE_STATUSES  = new Set(['pending', 'confirmed', 'checked_in'])
const HISTORY_STATUSES = new Set(['checked_out', 'cancelled'])

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  confirmed:   'Confirmed',
  checked_in:  'Checked In',
  checked_out: 'Completed',
  cancelled:   'Cancelled',
}

const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-amber-100  text-amber-700  border border-amber-200',
  confirmed:   'bg-blue-100   text-blue-700   border border-blue-200',
  checked_in:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  checked_out: 'bg-teal-100   text-teal-700   border border-teal-200',
  cancelled:   'bg-red-100    text-red-600    border border-red-200',
}

const PAYMENT_BADGE: Record<string, string> = {
  pending:   'bg-amber-50  text-amber-600',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-red-50    text-red-600',
  refunded:  'bg-gray-100  text-gray-500',
}

function nights(checkIn: string, checkOut: string) {
  return Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
  ))
}

function resolvePayment(raw: Payment | Payment[] | undefined): Payment | undefined {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.find(p => p.status === 'completed') ?? list[0]
}

// ─── Booking Card ─────────────────────────────────────────────────────
interface CardProps {
  booking: Booking
  isHistory: boolean
  cancellingId: string | null
  reviewingId: string | null
  reviewState: Record<string, { rating: number; comment: string }>
  onCancel: (id: string) => void
  onRating: (id: string, r: number) => void
  onComment: (id: string, c: string) => void
  onSubmitReview: (id: string) => void
}

function BookingCard({
  booking, isHistory,
  cancellingId, reviewingId, reviewState,
  onCancel, onRating, onComment, onSubmitReview,
}: CardProps) {
  const status    = booking.status
  const n         = nights(booking.check_in, booking.check_out)
  const payment   = resolvePayment(booking.payment)
  const payStatus = payment?.status ?? 'pending'
  const rev       = reviewState[booking.id] ?? { rating: 5, comment: '' }

  const isCompleted  = status === 'checked_out'
  const isCancelled  = status === 'cancelled'
  const canCancel    = status === 'pending'
  const needsReview  = isCompleted && !booking.review

  return (
    <div className={`bg-white rounded-2xl border transition-shadow hover:shadow-md overflow-hidden ${
      isCancelled ? 'border-red-100 opacity-80' : 'border-gray-200'
    }`}>
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/hotels/${booking.hotel_id}`}
            className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block"
          >
            {booking.hotel?.name ?? '—'}
          </Link>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {booking.hotel?.city}, {booking.hotel?.country}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancellingId === booking.id}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 text-red-500"
              aria-label="Cancel booking"
            >
              {cancellingId === booking.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <X className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="mx-5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><BedDouble className="h-3 w-3" /> Room</p>
          <p className="font-medium text-gray-800 truncate">
            {booking.room?.room_number ?? '—'}
            {booking.room?.room_type?.name ? ` · ${booking.room.room_type.name}` : ''}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Check-in</p>
          <p className="font-medium text-gray-800">{new Date(booking.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Check-out</p>
          <p className="font-medium text-gray-800">{new Date(booking.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><MoonStar className="h-3 w-3" /> Duration</p>
          <p className="font-medium text-gray-800">{n} night{n !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Footer row */}
      <div className="px-5 pb-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400 text-xs">Total</span>
          <span className="font-bold text-gray-900">Rs {Number(booking.total_amount).toLocaleString()}</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-xs">Payment</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PAYMENT_BADGE[payStatus] ?? 'bg-gray-100 text-gray-500'}`}>
            {payStatus.replace('_', ' ')}
          </span>
          {payment?.payment_method && (
            <span className="text-gray-400 text-xs capitalize">· {payment.payment_method}</span>
          )}
        </div>
        {booking.adults > 0 && (
          <>
            <div className="h-3 w-px bg-gray-200" />
            <span className="text-gray-400 text-xs">{booking.adults} adult{booking.adults !== 1 ? 's' : ''}{booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}</span>
          </>
        )}
      </div>

      {/* Pending advance notice */}
      {status === 'pending' && (
        <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <PhoneCall className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Awaiting advance payment</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Our team will contact you to collect a 50% advance. Your booking will be confirmed once received.
            </p>
          </div>
        </div>
      )}

      {/* Review form — only for completed bookings with no review */}
      {needsReview && (
        <div className="mx-5 mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Share your experience
          </p>
          <div className="flex items-center gap-0.5 mb-2">
            {[1,2,3,4,5].map(star => (
              <button key={star} type="button" onClick={() => onRating(booking.id, star)} className="p-0.5">
                <Star className={`h-5 w-5 transition-colors ${star <= rev.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={rev.comment}
              onChange={e => onComment(booking.id, e.target.value)}
              placeholder="How was your stay?"
              className="input text-sm flex-1"
            />
            <button
              onClick={() => onSubmitReview(booking.id)}
              disabled={reviewingId === booking.id || !rev.comment.trim()}
              className="btn-primary text-xs px-4 shrink-0 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {reviewingId === booking.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Check className="h-3 w-3" />}
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Review submitted */}
      {isCompleted && booking.review && (
        <div className="mx-5 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700">Review submitted</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= ((booking.review as Review).rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
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
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reviewingId,  setReviewingId]  = useState<string | null>(null)
  const [reviewState,  setReviewState]  = useState<Record<string, { rating: number; comment: string }>>({})
  const [showHistory,  setShowHistory]  = useState(true)

  const getReview    = (id: string) => reviewState[id] ?? { rating: 5, comment: '' }
  const setRating    = (id: string, rating: number)  => setReviewState(p => ({ ...p, [id]: { ...getReview(id), rating } }))
  const setComment   = (id: string, comment: string) => setReviewState(p => ({ ...p, [id]: { ...getReview(id), comment } }))

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
    const payment = searchParams.get('payment')
    if (payment === 'success')   { toast.success('Payment completed successfully'); fetchBookings() }
    if (payment === 'cancelled') { toast.error('Payment was cancelled') }
  }, [fetchBookings, searchParams])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    try {
      const res  = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch {
      toast.error('Could not cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const handleSubmitReview = async (bookingId: string) => {
    const { rating, comment } = getReview(bookingId)
    if (!comment.trim()) return
    setReviewingId(bookingId)
    const booking = bookings.find(b => b.id === bookingId)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, hotel_id: booking?.hotel_id ?? '', rating, comment }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Could not submit review')
    } else {
      toast.success('Review submitted!')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, review: json } : b))
      setReviewState(prev => { const next = { ...prev }; delete next[bookingId]; return next })
    }
    setReviewingId(null)
  }

  const activeBookings  = bookings.filter(b => ACTIVE_STATUSES.has(b.status))
  const historyBookings = bookings.filter(b => HISTORY_STATUSES.has(b.status))
  const completedCount  = historyBookings.filter(b => b.status === 'checked_out').length
  const cancelledCount  = historyBookings.filter(b => b.status === 'cancelled').length

  const cardProps = {
    cancellingId, reviewingId, reviewState,
    onCancel: handleCancel,
    onRating: setRating,
    onComment: setComment,
    onSubmitReview: handleSubmitReview,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
          <p className="text-sm text-gray-500 mt-0.5">{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700">{activeBookings.length} Active</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-xs font-semibold text-teal-700">{completedCount} Completed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-600">{cancelledCount} Cancelled</span>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {bookings.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-indigo-400" />
          </div>
          <p className="text-lg font-semibold text-gray-800 mb-1">No bookings yet</p>
          <p className="text-gray-500 text-sm mb-5">Find a hotel and make your first booking</p>
          <Link href="/" className="btn-primary text-sm px-5">Browse Hotels</Link>
        </div>
      )}

      {/* ── Active Bookings ── */}
      {activeBookings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Bookings</h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{activeBookings.length}</span>
          </div>
          <div className="space-y-3">
            {activeBookings.map(b => (
              <BookingCard key={b.id} booking={b} isHistory={false} {...cardProps} />
            ))}
          </div>
        </section>
      )}

      {/* ── Booking History ── */}
      {historyBookings.length > 0 && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <History className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Booking History</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{historyBookings.length}</span>
            <span className="ml-auto text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
              {showHistory ? 'Hide' : 'Show'}
            </span>
          </button>

          {showHistory && (
            <div className="space-y-3">
              {historyBookings.map(b => (
                <BookingCard key={b.id} booking={b} isHistory={true} {...cardProps} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
