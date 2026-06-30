'use client'

import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="card p-8 lg:p-10">
          <h1 className="text-3xl font-bold text-gray-900">Privacy policy</h1>
          <p className="mt-4 text-sm leading-7 text-gray-600">We collect only the information needed to operate guest bookings, support your team, and keep your hotel data secure. This may include profile details, booking records, payment references, and communication preferences.</p>
          <p className="mt-4 text-sm leading-7 text-gray-600">Your information is used to fulfill reservations, process payments, and improve the quality of the service. We do not sell guest data to third parties.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
