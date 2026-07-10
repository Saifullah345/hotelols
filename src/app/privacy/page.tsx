import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-10 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">HotelOS</span>
        </div>

        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: July 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Who We Are</h2>
            <p>
              HotelOS operates a cloud-based hotel management platform (&ldquo;the Platform&rdquo;).
              This Privacy Policy explains how we collect, use, and protect information when you use our services.
              By using HotelOS you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Account Information</p>
                <p className="text-gray-500">Full name, email address, and password (stored as a secure hash) when you register.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Hotel &amp; Business Data</p>
                <p className="text-gray-500">Hotel name, address, city, contact details, room configurations, pricing, and bookings that you enter into the Platform.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Usage Data</p>
                <p className="text-gray-500">Pages visited, features used, device type, browser, and IP address collected automatically to improve the service.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Payment Data</p>
                <p className="text-gray-500">Payment processing is handled by Stripe. We do not store your full card details — only the last four digits and card type for display purposes.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To create and manage your account and hotel profile.</li>
              <li>To provide, maintain, and improve the Platform&apos;s features.</li>
              <li>To send transactional emails (account verification, booking confirmations, billing receipts).</li>
              <li>To respond to support requests and resolve disputes.</li>
              <li>To detect and prevent fraud, abuse, or security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3 text-sm">
              We do <strong>not</strong> sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Storage &amp; Security</h2>
            <p>
              Your data is stored on secure servers provided by Supabase (hosted on AWS). We use row-level security to ensure
              that each hotel account can only access its own data. All data in transit is encrypted using TLS/HTTPS.
              Access to production systems is restricted to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you close your account, you may request an
              export of your data within 30 days. After that period we may permanently delete your data from our systems,
              except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services to operate the Platform:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
              <li><strong>Stripe</strong> — payment processing. Subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe&apos;s Privacy Policy</a>.</li>
              <li><strong>Resend</strong> — transactional email delivery.</li>
            </ul>
            <p className="mt-3 text-sm">Each third party is bound by their own privacy policies and data processing agreements.</p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p>
              HotelOS uses strictly necessary cookies for authentication (session management) and security purposes.
              We do not use third-party advertising or tracking cookies.
              You can control cookies through your browser settings, but disabling session cookies will prevent you from logging in.
            </p>
          </section>

          <section id="gdpr">
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights (GDPR &amp; Data Subject Rights)</h2>
            <p className="mb-2">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification</strong> — ask us to correct inaccurate or incomplete data.</li>
              <li><strong>Erasure</strong> — request deletion of your personal data (subject to legal obligations).</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection</strong> — object to processing of your data for certain purposes.</li>
              <li><strong>Restriction</strong> — request that we limit how we use your data while a dispute is resolved.</li>
            </ul>
            <p className="mt-3 text-sm">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@hotelos.com" className="text-blue-600 hover:underline">privacy@hotelos.com</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              HotelOS is not directed at children under 16. We do not knowingly collect personal data from children.
              If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or through
              the Platform. The &ldquo;Last updated&rdquo; date at the top of this page indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p>For any privacy-related questions or to exercise your data rights, contact us at:</p>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm">
              <p className="font-semibold text-gray-900">HotelOS Privacy Team</p>
              <p className="text-gray-500 mt-1">
                Email:{' '}
                <a href="mailto:privacy@hotelos.com" className="text-blue-600 hover:underline">
                  privacy@hotelos.com
                </a>
              </p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 px-6 mt-12">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} HotelOS. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-gray-700 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
