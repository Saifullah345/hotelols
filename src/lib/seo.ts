import type { Metadata } from 'next'

/** Canonical origin. Override per-environment with NEXT_PUBLIC_SITE_URL (no trailing slash). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bookqayam.com').replace(/\/+$/, '')

export const SITE_NAME = 'BookQayam'

export const SITE_TITLE = 'BookQayam — Book Verified Hotels Across Pakistan Online'

export const SITE_DESCRIPTION =
  'Browse verified hotels across Pakistan, compare live prices and real guest reviews, then book your stay in minutes — no sign-up needed to explore.'

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

type PageSeoInput = {
  /** Full <title> — used verbatim, so it is not suffixed with the site name. Aim for 50–60 chars. */
  title: string
  /** Meta description. Aim for 140–160 chars. */
  description: string
  /** Site-relative path, used for the canonical URL. */
  path: string
  /** Set for pages that should stay out of the index (search results, auth, dashboards). */
  noIndex?: boolean
  /** Overrides the route's generated opengraph-image (e.g. a hotel's own photo). */
  images?: string[]
  type?: 'website' | 'article'
}

/**
 * Builds a complete, consistent metadata object: canonical + Open Graph + Twitter card.
 * Every public page should go through this so nothing drifts.
 */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
  images,
  type = 'website',
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path)

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } } : {}),
    openGraph: {
      type,
      siteName: SITE_NAME,
      url,
      title,
      description,
      locale: 'en_PK',
      ...(images?.length ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images?.length ? { images } : {}),
    },
  }
}

/** Metadata for private areas — keeps dashboards and auth flows out of search results. */
export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}
