'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ReviewToggle({ reviewId, isPublished }: { reviewId: string; isPublished: boolean }) {
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, isPublished: !isPublished }),
    })
    if (!res.ok) {
      alert('Failed to update review')
    }
    setLoading(false)
    window.location.reload()
  }

  return (
    <button type="button" onClick={toggle} disabled={loading}
      className={`btn-${isPublished ? 'secondary' : 'primary'} text-xs py-1 px-3 inline-flex items-center gap-1`}>
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {isPublished ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      {isPublished ? 'Hide' : 'Publish'}
    </button>
  )
}
