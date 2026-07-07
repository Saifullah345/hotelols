'use client'

import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="card p-8 lg:p-10">
          <h1 className="text-3xl font-bold text-gray-900">Terms of service</h1>
          <p className="mt-4 text-sm leading-7 text-gray-600">By using HotelOS, you agree to maintain accurate property information, comply with local hospitality rules, and use the platform responsibly for guest bookings and administrative tasks.</p>
          <p className="mt-4 text-sm leading-7 text-gray-600">Payments and booking confirmations are handled through the configured gateways and may be subject to the terms of the provider.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
