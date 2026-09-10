import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { LogoMark } from '@/components/layout/Logo'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Privacy Policy — BookQayam',
  description:
    'Learn how BookQayam collects, uses and protects your personal information when you search for and book hotels across Pakistan.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-10 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <LogoMark svgSize={32} />
          <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">BookQayam</span>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Effective date: 1 September 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. About BookQayam</h2>
            <p>
              BookQayam is an online hotel booking platform that connects travellers with accommodation providers across Pakistan.
              This Privacy Policy explains what personal information we collect, how we use it and the rights you have over it.
              It applies to all visitors, registered users and guests who complete a reservation through our website or mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information in two ways: directly from you and automatically when you use our platform.</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Account Details</p>
                <p className="text-gray-500">Full name, email address and password when you create an account. Passwords are stored as a one-way cryptographic hash and are never readable by our team.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Reservation Information</p>
                <p className="text-gray-500">Check-in and check-out dates, number of guests, room preferences, special requests and any information you choose to share at the time of booking.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Payment Information</p>
                <p className="text-gray-500">Payment processing is handled by Paddle. We do not store your card number, CVV or full payment credentials. We retain only a transaction reference and the last four digits of your card for record purposes.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Device and Usage Data</p>
                <p className="text-gray-500">IP address, browser type, device model, pages visited and session duration. This data is collected automatically and is used to operate and improve the platform.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Communications</p>
                <p className="text-gray-500">Messages you send to our support team and any feedback or reviews you submit about a property.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>To process and confirm your hotel reservations and send booking confirmations by email.</li>
              <li>To share relevant booking details with the accommodation provider so they can prepare for your arrival.</li>
              <li>To handle payment authorisation and billing for your reservation.</li>
              <li>To send pre-arrival reminders, post-stay review requests and service updates related to your booking.</li>
              <li>To respond to your queries and resolve any disputes or complaints.</li>
              <li>To detect and prevent fraud, abuse and unauthorised access.</li>
              <li>To analyse how the platform is used so we can improve search results, features and performance.</li>
              <li>To comply with our legal and regulatory obligations.</li>
            </ul>
            <p className="mt-3 text-sm">
              We do <strong>not</strong> sell your personal information to third parties. We do not use your data for targeted advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Sharing Your Information</h2>
            <p className="mb-3 text-sm">We share your information only where necessary to deliver the service:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Accommodation providers</strong> receive your name, contact details, arrival dates and special requests so they can fulfill your reservation.</li>
              <li><strong>Payment processors</strong> (Paddle) receive the information needed to complete your transaction securely.</li>
              <li><strong>Email delivery</strong> (Resend) is used solely to send transactional messages such as booking confirmations and receipts.</li>
              <li><strong>Infrastructure providers</strong> (Supabase, AWS) host our database and application under data processing agreements that require them to protect your data.</li>
              <li><strong>Law enforcement or regulators</strong> when we are legally required to disclose information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
            <p>
              All data transmitted between your device and our platform is encrypted using TLS. Data at rest is stored on
              Supabase infrastructure hosted on AWS with row-level security controls that ensure each user can access only
              their own records. Access to production systems is limited to authorised personnel and is protected by
              multi-factor authentication.
            </p>
            <p className="mt-3 text-sm">
              No system is completely secure. If you suspect that your account has been compromised, contact us immediately
              at <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline">privacy@bookqayam.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We keep your account information for as long as your account remains active. Booking records are retained for
              seven years to satisfy tax and accounting obligations. If you close your account, you may request a copy of
              your data within 30 days of closure. After that period your personal information will be deleted from our
              active systems, except where the law requires longer retention.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p>
              We use session cookies to keep you logged in and to maintain your search preferences within a browsing session.
              We also use analytics cookies (Google Analytics) to understand how visitors use the platform. These analytics
              cookies do not identify you personally.
            </p>
            <p className="mt-3 text-sm">
              You can disable cookies in your browser settings. Disabling session cookies will prevent you from signing in
              or completing a reservation.
            </p>
          </section>

          <section id="rights">
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the following rights over your personal information:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> ask us to fix information that is inaccurate or out of date.</li>
              <li><strong>Deletion:</strong> request that we delete your personal data, subject to any legal retention obligations.</li>
              <li><strong>Portability:</strong> receive your data in a commonly used machine-readable format.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interests.</li>
              <li><strong>Restriction:</strong> ask us to pause processing of your data while a concern is being resolved.</li>
            </ul>
            <p className="mt-3 text-sm">
              To make a request, email <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline">privacy@bookqayam.com</a>.
              We will respond within 30 days. We may ask you to verify your identity before acting on a request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children</h2>
            <p>
              BookQayam is not intended for use by anyone under the age of 18. We do not knowingly collect personal
              information from children. If you believe a child has created an account or made a booking through our
              platform, please contact us and we will remove the data without delay.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may revise this Privacy Policy as our services evolve or as legal requirements change. When we make
              material changes, we will notify registered users by email at least 14 days before the changes take
              effect. The effective date at the top of this page shows when it was last updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact</h2>
            <p>For privacy questions or to exercise your rights, reach us at:</p>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm">
              <p className="font-semibold text-gray-900">BookQayam Privacy Team</p>
              <p className="text-gray-500 mt-1">
                <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline">privacy@bookqayam.com</a>
              </p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 px-6 mt-12">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} BookQayam. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-gray-700 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
