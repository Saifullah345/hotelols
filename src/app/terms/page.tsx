import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { LogoMark } from '@/components/layout/Logo'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Terms & Conditions — BookQayam',
  description:
    'Read the terms and conditions that govern your use of BookQayam, including booking rules, cancellation policies and hotel partner obligations.',
  path: '/terms',
})

export default function TermsPage() {
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

        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: 1 September 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of These Terms</h2>
            <p>
              By visiting bookqayam.com or making a reservation through our platform, you agree to be bound by these
              Terms and Conditions and our Privacy Policy. If you do not agree, do not use the platform.
            </p>
            <p className="mt-3">
              These terms apply to all users of BookQayam, including travellers making reservations and hotel partners
              who list their properties on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. What BookQayam Provides</h2>
            <p>
              BookQayam is an online marketplace that enables travellers to search, compare and book hotel rooms across
              Pakistan. We act as an intermediary between guests and accommodation providers. We are not the hotel and
              we are not a party to the accommodation contract between you and the property.
            </p>
            <p className="mt-3">
              When you complete a reservation, a contract forms directly between you and the accommodation provider.
              BookQayam facilitates that transaction but does not guarantee the accuracy of property descriptions,
              amenities or availability. Accommodation providers are solely responsible for the information they publish
              on their listings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
            <p>
              To make a reservation you must create a BookQayam account. You must be at least 18 years old and provide
              accurate information during registration. You are responsible for keeping your password confidential and
              for all activity that occurs under your account.
            </p>
            <p className="mt-3">
              Notify us immediately at <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline">support@bookqayam.com</a> if
              you believe your account has been accessed without your permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Bookings and Reservations</h2>
            <p className="mb-3">When you submit a reservation request:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>You confirm that all traveller information you provide is accurate.</li>
              <li>You agree to arrive within any time window specified by the property.</li>
              <li>You acknowledge that room rates may include taxes and service charges as shown at checkout.</li>
              <li>A booking confirmation sent to your registered email address constitutes proof of your reservation.</li>
            </ul>
            <p className="mt-3 text-sm">
              Room availability displayed on the platform is provided in real time by the accommodation provider. In
              rare cases a room may become unavailable after you receive a confirmation. If this happens we will notify
              you promptly and provide a full refund or an alternative property of equivalent standard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payments</h2>
            <p>
              Payments are processed securely by Paddle on our behalf. By completing a payment you authorise Paddle to
              charge the amount shown at checkout to your chosen payment method. All amounts are displayed in the
              currency indicated on the checkout screen.
            </p>
            <p className="mt-3 text-sm">
              BookQayam does not store your full card details. In the event of a payment dispute, contact your card
              issuer or reach our support team at <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline">support@bookqayam.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cancellations and Refunds</h2>
            <p>
              Each property sets its own cancellation policy, which is displayed before you confirm your booking.
              Cancellation policies may range from fully refundable to non-refundable depending on the rate selected.
              By completing a reservation you accept the cancellation terms in force for that booking.
            </p>
            <p className="mt-3 text-sm">
              To cancel a reservation, sign in to your account, go to your bookings, and follow the cancellation steps.
              Refunds, where applicable, are returned to your original payment method within 7 to 14 business days
              depending on your bank.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Guest Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Treat the property and its staff with respect throughout your stay.</li>
              <li>Comply with the property's own house rules, including check-in and check-out times.</li>
              <li>Do not use a reservation for any purpose other than your personal accommodation.</li>
              <li>Report any issues with the room directly to the property during your stay. Raising concerns after checkout may limit your ability to seek a remedy.</li>
              <li>Guests are liable for any damage caused to the property during the reservation period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Hotel Partner Responsibilities</h2>
            <p>
              Hotels and guesthouses that list on BookQayam agree to the following:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm">
              <li>All listing information, including photos, descriptions, room rates, amenities and availability, must be accurate and kept up to date.</li>
              <li>Confirmed reservations must be honoured. If a property cannot accommodate a confirmed guest, the property is responsible for arranging equivalent alternative accommodation at no additional cost to the guest.</li>
              <li>Properties must not directly contact guests to redirect bookings away from the platform.</li>
              <li>Properties are responsible for collecting any taxes due under local law that are not collected at the time of booking through our platform.</li>
              <li>Properties must comply with all applicable health, safety and licensing regulations.</li>
            </ul>
            <p className="mt-3 text-sm">
              BookQayam reserves the right to remove any property listing that consistently receives complaints, fails
              to meet the above obligations, or otherwise harms the guest experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Partner Subscriptions and Billing</h2>
            <p>
              Hotel partners access property management features through a subscription plan. Subscriptions are billed
              monthly or annually in advance, depending on the plan selected. All subscription fees are non-refundable
              except where required by law or as stated in the specific plan terms.
            </p>
            <p className="mt-3 text-sm">
              New hotel partners may access a free trial period. At the end of the trial, a paid subscription is
              required to continue using the platform. No charge is applied during the trial period and you may cancel
              before the trial ends without cost.
            </p>
            <p className="mt-3 text-sm">
              We will give at least 30 days notice before changing subscription pricing. Continued use of the platform
              after that notice period constitutes acceptance of the revised pricing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Prohibited Conduct</h2>
            <p className="mb-3 text-sm">You may not:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Use automated tools to scrape, extract or download content from the platform without written permission.</li>
              <li>Create fake accounts, reviews or listings.</li>
              <li>Attempt to gain unauthorised access to any part of our systems or another user's account.</li>
              <li>Use the platform to facilitate transactions that circumvent our payment processing.</li>
              <li>Post or transmit content that is false, defamatory or violates any third-party rights.</li>
            </ul>
            <p className="mt-3 text-sm">
              Violation of these rules may result in the immediate suspension or termination of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Intellectual Property</h2>
            <p>
              All content on BookQayam, including the platform design, software, logos and written content produced by
              BookQayam, is owned by or licensed to us and is protected under applicable copyright law. You may not
              reproduce, distribute or create derivative works from our content without written permission.
            </p>
            <p className="mt-3 text-sm">
              When a hotel partner uploads photos or content to their listing, they grant BookQayam a non-exclusive
              licence to display that content for the purpose of operating and marketing the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Service Availability</h2>
            <p>
              We aim to keep the platform available at all times but do not guarantee uninterrupted access. We may
              take the platform offline for maintenance, security updates or other operational reasons. Where possible
              we will give advance notice of planned downtime.
            </p>
            <p className="mt-3 text-sm">
              We are not liable for losses arising from service interruptions that are outside our reasonable control,
              including failures of third-party infrastructure or internet providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, BookQayam's total liability to you for any claim arising from
              your use of the platform is limited to the amount you paid for the specific transaction that gave rise
              to the claim.
            </p>
            <p className="mt-3 text-sm">
              BookQayam is not liable for the acts or omissions of accommodation providers, including failure to honour
              a reservation, inaccurate property descriptions, or any loss or damage you suffer during a stay. Your
              remedy in those cases is against the accommodation provider directly.
            </p>
            <p className="mt-3 text-sm">
              Nothing in these terms limits liability for death or personal injury caused by our negligence, or for
              fraud or fraudulent misrepresentation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Account Termination</h2>
            <p>
              You may close your account at any time by contacting us. We reserve the right to suspend or terminate
              any account that violates these terms, engages in fraud, or poses a risk to other users or the platform.
            </p>
            <p className="mt-3 text-sm">
              On termination, any outstanding booking obligations remain in force. Completed bookings are not affected
              by the closure of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. We will notify registered users by email at least 14 days
              before material changes take effect. Continued use of the platform after the effective date constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">16. Governing Law</h2>
            <p>
              These terms are governed by the laws of Pakistan. Any dispute arising under these terms will be subject
              to the exclusive jurisdiction of the courts of Pakistan, unless otherwise required by applicable consumer
              protection law in your country of residence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">17. Contact</h2>
            <p>For questions about these terms, contact us at:</p>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm">
              <p className="font-semibold text-gray-900">BookQayam Support</p>
              <p className="text-gray-500 mt-1">
                <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline">support@bookqayam.com</a>
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
