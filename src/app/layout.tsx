import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import NextTopLoader from 'nextjs-toploader'
import SmoothScroll from '@/components/SmoothScroll'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, absoluteUrl } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'travel',
  keywords: [
    'hotel booking',
    'book hotels in Pakistan',
    'online hotel reservation',
    'verified hotels',
    'cheap hotels Pakistan',
    'hotel management software',
    'property management system',
    'hotel PMS',
    'list your hotel',
    'BookQayam',
  ],
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_PK',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  formatDetection: { telephone: false, email: false, address: false },
  referrer: 'origin-when-cross-origin',
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
}

// Sitewide structured data: who we are, and how site search works.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/icon.svg'),
  description: SITE_DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Pakistan' },
  sameAs: [] as string[],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en',
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?city={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No `h-full` on <html>: pinning it to the viewport height is what stops Lenis
  // measuring how far a long page can actually scroll.
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-gray-50">
        <JsonLd data={[organizationSchema, websiteSchema]} />
        <NextTopLoader color="#2563eb" height={3} showSpinner={false} />
        <SmoothScroll />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
