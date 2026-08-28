import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/seo'

// Force Next.js to render this dynamically instead of hanging at build time
export const dynamic = 'force-dynamic'
export const revalidate = 3600

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/',                 changeFrequency: 'daily',   priority: 1.0 },
  { path: '/hotel-management',  changeFrequency: 'monthly', priority: 0.9 },
  { path: '/about',             changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact',           changeFrequency: 'monthly', priority: 0.6 },
  { path: '/security',          changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy',           changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terms',             changeFrequency: 'yearly',  priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  let hotelEntries: MetadataRoute.Sitemap = []
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('hotels')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(10000)

    if (error) console.error('[sitemap] hotel query failed:', error.message)

    hotelEntries = (data ?? []).map(h => ({
      url: absoluteUrl(`/hotels/${h.id}`),
      lastModified: h.updated_at ? new Date(h.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (e) {
    console.error('[sitemap] falling back to static routes:', e)
  }

  return [...staticEntries, ...hotelEntries]
}