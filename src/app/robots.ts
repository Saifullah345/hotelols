import type { MetadataRoute } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/hotel-admin/',
          '/super-admin/',
          '/staff/',
          '/customer/',
          '/login',
          '/register',
          '/register-hotel',
          '/search?', // query-string result pages — thin/duplicate content
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
