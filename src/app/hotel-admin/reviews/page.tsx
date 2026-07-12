import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star } from 'lucide-react'
import ReviewToggle from './ReviewToggle'
import AutoFilterForm from '@/components/ui/AutoFilterForm'

export const metadata = { title: 'Reviews' }

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string; published?: string }>
}) {
  const { rating, published } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  let query = supabase
    .from('reviews')
    .select('*, user:profiles(full_name)')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  if (rating)                query = query.eq('rating', parseInt(rating))
  if (published === 'true')  query = query.eq('is_published', true)
  if (published === 'false') query = query.eq('is_published', false)

  const { data: reviews } = await query

  const { data: allReviews } = await supabase
    .from('reviews').select('rating').eq('hotel_id', tenantId)

  const avgRating = allReviews?.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : '0.0'

  const hasFilter = !!(rating || published)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
        <div className="flex items-center gap-2 mt-1">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          <span className="text-xl font-bold text-gray-900">{avgRating}</span>
          <span className="text-gray-500 text-sm">({reviews?.length ?? 0} showing of {allReviews?.length ?? 0} total)</span>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="grid grid-cols-5 gap-2">
        {[5, 4, 3, 2, 1].map(star => {
          const count = allReviews?.filter(r => r.rating === star).length ?? 0
          const pct = allReviews?.length ? Math.round((count / allReviews.length) * 100) : 0
          return (
            <Link
              key={star}
              href={rating === String(star) ? '/hotel-admin/reviews' : `/hotel-admin/reviews?rating=${star}`}
              className={`card p-3 text-center transition-colors hover:bg-primary-50 ${rating === String(star) ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
            >
              <div className="flex justify-center mb-1">
                {Array.from({ length: star }, (_, i) => (
                  <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{pct}%</p>
            </Link>
          )
        })}
      </div>

      {/* Filter bar */}
      <AutoFilterForm className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <select
          name="rating"
          defaultValue={rating ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map(s => (
            <option key={s} value={s}>{'★'.repeat(s)} ({s} star{s !== 1 ? 's' : ''})</option>
          ))}
        </select>
        <select
          name="published"
          defaultValue={published ?? ''}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Visibility</option>
          <option value="true">Published</option>
          <option value="false">Hidden</option>
        </select>
        {hasFilter && (
          <Link href="/hotel-admin/reviews" className="text-sm text-gray-500 hover:text-gray-800">Clear</Link>
        )}
      </AutoFilterForm>

      <div className="space-y-4">
        {reviews?.map(review => (
          <div key={review.id} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{(review.user as { full_name?: string })?.full_name}</p>
                <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                ))}
                <span className="ml-1 text-sm font-medium text-gray-700">{review.rating}.0</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm">{review.comment}</p>
            <div className="mt-3">
              <ReviewToggle reviewId={review.id} isPublished={review.is_published} />
            </div>
          </div>
        ))}
        {!reviews?.length && (
          <div className="card p-12 text-center text-gray-500">No reviews match your filters.</div>
        )}
      </div>
    </div>
  )
}
