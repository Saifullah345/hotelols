'use client'

import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="card p-8 lg:p-10">
          <h1 className="text-3xl font-bold text-gray-900">Security</h1>
          <p className="mt-4 text-sm leading-7 text-gray-600">HotelOS is designed with tenant-aware access controls, secure authentication, and encrypted communication channels for sensitive booking and payment data.</p>
          <p className="mt-4 text-sm leading-7 text-gray-600">We recommend enabling strong passwords and limiting access to trusted hotel staff members.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
