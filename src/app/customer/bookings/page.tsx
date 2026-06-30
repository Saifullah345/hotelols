'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Check, CreditCard, MapPin, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCallback, useEffect, useState } from 'react'

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  checked_in: 'badge-green',
  checked_out: 'badge-gray',
  cancelled: 'badge-red',
}

const paymentBadge: Record<string, string> = {
  pending: 'badge-yellow',
  completed: 'badge-green',
  failed: 'badge-red',
  refunded: 'badge-gray',
}

export default function CustomerBookingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { data } = await supabase
      .from('bookings')
      .select('*, hotel:hotels(name, city, country), room:rooms(room_number, room_type:room_types(name)), payment:payments(status, amount, payment_method)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setBookings(data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') {
      toast.success('Payment completed successfully')
      fetchBookings()
    }
    if (payment === 'cancelled') {
      toast.error('Payment was cancelled')
    }
  }, [fetchBookings, searchParams])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    const supabase = createClient()
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Booking cancelled')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    }
    setCancellingId(null)
  }

  const handlePayNow = async (bookingId: string) => {
    setPayingId(bookingId)
    const res = await fetch('/api/payments/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Unable to start payment')
      setPayingId(null)
      return
    }

    window.location.href = json.url
  }

  const submitReview = async (bookingId: string) => {
    if (!reviewComment.trim() || !reviewRating) return
    setReviewingId(bookingId)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        hotel_id: String((bookings.find(b => String(b.id) === bookingId) as Record<string, unknown> | undefined)?.hotel_id ?? ''),
        rating: reviewRating,
        comment: reviewComment,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Could not submit review')
    } else {
      toast.success('Review submitted!')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, review: json } : b))
      setReviewComment('')
      setReviewRating(5)
    }
    setReviewingId(null)
  }

  if (loading) return <div className="space-y-6"><div className="card p-5"><p>Loading...</p></div></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
        <p className="text-gray-500 text-sm mt-1">{bookings?.length ?? 0} total bookings</p>
      </div>

      <div className="space-y-4">
        {bookings?.map(b => {
          const booking = b as Record<string, unknown>
          const payment = (booking.payment as { status?: string; payment_method?: string } | undefined)
          const paymentStatus = payment?.status ?? 'pending'
          const showPayButton = paymentStatus === 'pending' && booking.status !== 'cancelled'

          return (
            <div key={String(booking.id)} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{(booking.hotel as { name?: string })?.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {(booking.hotel as { city?: string })?.city}, {(booking.hotel as { country?: string })?.country}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={statusBadge[String(booking.status)] ?? 'badge-gray'}>{String(booking.status).replace('_', ' ')}</span>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(String(booking.id))}
                      disabled={cancellingId === String(booking.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label="Cancel booking"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Room</p>
                  <p className="font-medium">
                    {(booking.room as { room_number?: string })?.room_number} —{' '}
                    {((booking.room as { room_type?: { name?: string } })?.room_type)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Check-in</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(String(booking.check_in)).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Check-out</p>
                  <p className="font-medium">{new Date(String(booking.check_out)).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Total</p>
                  <p className="font-bold text-primary-700">${String(booking.total_amount)}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500">Payment:</span>
                <span className={paymentBadge[paymentStatus] ?? 'badge-yellow'}>
                  {paymentStatus.replace('_', ' ')}
                </span>
                {payment?.payment_method && (
                  <span className="text-gray-400 capitalize">· {payment.payment_method}</span>
                )}
                {showPayButton && (
                  <button
                    onClick={() => handlePayNow(String(booking.id))}
                    disabled={payingId === String(booking.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 disabled:opacity-50"
                  >
                    <CreditCard className="h-4 w-4" />
                    {payingId === String(booking.id) ? 'Redirecting...' : 'Pay now'}
                  </button>
                )}
              </div>

              {booking.status === 'checked_out' && !booking.review && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs text-gray-500 font-medium">Leave a review</label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setReviewRating(star)}
                        className="p-0.5">
                        <Star key={star} className={`h-5 w-5 ${star <= reviewRating ? 'text-gold-500 fill-current' : 'text-gray-300'}`} />
                      </button>
                    ))}
                    <input type="text" value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder="Write a comment..." className="input text-sm mt-2" />
                    <button onClick={() => submitReview(String(booking.id))}
                      disabled={reviewingId === String(booking.id) || !reviewComment.trim()}
                      className="btn-primary text-xs py-1.5 px-3 mt-2 inline-flex items-center gap-1">
                      {reviewingId === String(booking.id) && <Check className="h-3 w-3 animate-spin" />}
                      Submit Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!bookings?.length && (
          <div className="card p-12 text-center">
            <p className="text-lg font-medium text-gray-700 mb-2">No bookings yet</p>
            <p className="text-gray-500 text-sm">Find a hotel and make your first booking!</p>
          </div>
        )}
      </div>
    </div>
  )
}