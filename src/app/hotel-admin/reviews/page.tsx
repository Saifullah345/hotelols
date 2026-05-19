import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'

export const metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, user:profiles(full_name)')
    .eq('hotel_id', tenantId)
    .order('created_at', { ascending: false })

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
          <div className="flex items-center gap-2 mt-1">
            <Star className="h-5 w-5 text-gold-500 fill-current" />
            <span className="text-xl font-bold text-gray-900">{avgRating}</span>
            <span className="text-gray-500 text-sm">({reviews?.length ?? 0} reviews)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {[5,4,3,2,1].map(star => {
          const count = reviews?.filter(r => r.rating === star).length ?? 0
          const pct = reviews?.length ? Math.round((count / reviews.length) * 100) : 0
          return (
            <div key={star} className="card p-3 text-center">
              <div className="flex justify-center mb-1">
                {Array.from({ length: star }, (_, i) => (
                  <Star key={i} className="h-3 w-3 text-gold-500 fill-current" />
                ))}
              </div>
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{pct}%</p>
            </div>
          )
        })}
      </div>

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
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-gold-500 fill-current' : 'text-gray-300'}`} />
                ))}
                <span className="ml-1 text-sm font-medium text-gray-700">{review.rating}.0</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm">{review.comment}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={review.is_published ? 'badge-green' : 'badge-gray'}>
                {review.is_published ? 'Published' : 'Hidden'}
              </span>
            </div>
          </div>
        ))}
        {!reviews?.length && (
          <div className="card p-12 text-center text-gray-500">No reviews yet</div>
        )}
      </div>
    </div>
  )
}
