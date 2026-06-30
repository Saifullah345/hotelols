import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: { default: 'HotelOS — Hotel Management Platform', template: '%s | HotelOS' },
  description: 'Multi-tenant hotel management SaaS platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gray-50">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
