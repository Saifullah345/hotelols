import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata = { title: 'Terms & Conditions' }

export default function TermsPage() {
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

        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: July 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using HotelOS (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms &amp; Conditions.
              If you are registering on behalf of a hotel or business, you confirm that you have the authority to bind that
              entity to these terms. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              HotelOS is a cloud-based hotel management platform that provides hotel owners and their staff with tools to manage
              rooms, bookings, payments, staff roles, and analytics. The Platform is provided on a subscription basis and may
              include a mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
            <p>To use the Platform you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Provide accurate and complete information during registration.</li>
              <li>Keep your login credentials confidential and not share them with others.</li>
              <li>Notify us immediately at <a href="mailto:support@hotelos.com" className="text-blue-600 hover:underline">support@hotelos.com</a> if you suspect unauthorised access to your account.</li>
              <li>Be responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Hotel Owner Responsibilities</h2>
            <p>Hotel owners who register their property on HotelOS are solely responsible for:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>The accuracy of hotel information, room listings, pricing, and availability.</li>
              <li>Compliance with all local laws, licensing requirements, and tax obligations applicable to their property.</li>
              <li>The conduct of staff members who access the Platform under the hotel&apos;s account.</li>
              <li>Handling guest complaints, refunds, and disputes arising from their hotel operations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Subscription &amp; Billing</h2>
            <p>
              Access to the Platform is subject to a subscription fee based on your selected plan (Basic, Pro, or Enterprise).
              By subscribing you authorise us to charge the applicable fees to your payment method on a recurring basis.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Subscriptions renew automatically at the end of each billing cycle unless cancelled.</li>
              <li>You may cancel at any time from your account settings; cancellation takes effect at the end of the current billing period.</li>
              <li>We reserve the right to change pricing with 30 days&rsquo; advance notice.</li>
              <li>All fees are non-refundable except where required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Free Trial</h2>
            <p>
              New hotel registrations receive a 14-day free trial. No payment information is required to start a trial.
              At the end of the trial period your account will be downgraded unless you choose a paid plan.
              We reserve the right to modify or discontinue free trial offers at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Use the Platform for any unlawful purpose or in violation of any regulations.</li>
              <li>Attempt to gain unauthorised access to any part of the Platform or other accounts.</li>
              <li>Upload malicious code or software intended to damage or interfere with the Platform.</li>
              <li>Resell, sublicense, or commercially exploit the Platform without our written permission.</li>
              <li>Scrape or extract data from the Platform using automated means.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data &amp; Privacy</h2>
            <p>
              Your use of the Platform is also governed by our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, which is incorporated
              into these terms by reference. You retain ownership of all data you upload to the Platform.
              We process your data solely to provide the service and as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Intellectual Property</h2>
            <p>
              The Platform, including its design, code, trademarks, and content, is owned by HotelOS and protected by
              intellectual property laws. These terms do not grant you any ownership rights in the Platform.
              You may not copy, modify, or distribute the Platform without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Service Availability</h2>
            <p>
              We aim to keep the Platform available at all times but do not guarantee uninterrupted access.
              Scheduled maintenance will be communicated with reasonable advance notice where possible.
              We are not liable for losses resulting from downtime or service interruptions beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account if you breach these terms, engage in fraudulent
              activity, or fail to pay applicable fees. Upon termination you may request an export of your data within
              30 days; after that period your data may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, HotelOS shall not be liable for any indirect, incidental, special,
              or consequential damages arising from your use of or inability to use the Platform.
              Our total liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of significant changes by email or by displaying
              a notice on the Platform. Continued use after changes take effect constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Governing Law</h2>
            <p>
              These terms are governed by the laws of Pakistan. Any disputes shall be subject to the exclusive jurisdiction
              of the courts of Pakistan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm">
              <p className="font-semibold text-gray-900">HotelOS Support</p>
              <p className="text-gray-500 mt-1">
                Email:{' '}
                <a href="mailto:support@hotelos.com" className="text-blue-600 hover:underline">
                  support@hotelos.com
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
