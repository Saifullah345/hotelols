import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { LogoMark } from '@/components/layout/Logo'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Privacy Policy | BookQayam',
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
              BookQayam operates an online hotel booking marketplace at bookqayam.com that serves two groups of users:
              travellers who search for and book accommodation across Pakistan, and hotel partners who list and manage
              their properties through our platform.
            </p>
            <p className="mt-3">
              This Privacy Policy explains what personal information we collect from each group, why we collect it,
              how we use and share it, and the rights you have over it. Read the section that applies to your role,
              though all sections apply if you use the platform in both capacities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect — Guests</h2>
            <p className="mb-4 text-sm">Information collected from travellers and anyone making a reservation:</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Account Information</p>
                <p className="text-gray-500">Full name, email address and password. Passwords are stored as a one-way cryptographic hash and cannot be read by our team.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Reservation Details</p>
                <p className="text-gray-500">Check-in and check-out dates, number of guests, room type selected, special requests, dietary requirements or accessibility needs you choose to share.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Payment Information</p>
                <p className="text-gray-500">Payments are processed by Paddle. We do not store your full card number, CVV or banking credentials. We retain only a transaction reference ID, the last four digits of your card, card type and the transaction amount for our records and for resolving disputes.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Contact Details</p>
                <p className="text-gray-500">Phone number if provided, used only to share with the property so they can contact you about your arrival.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Reviews and Feedback</p>
                <p className="text-gray-500">Written reviews, star ratings and any feedback you submit after a stay. Reviews are published on the property listing under your display name.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Communications</p>
                <p className="text-gray-500">Messages sent to our support team, including complaints, refund requests and general queries.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Information We Collect — Hotel Partners</h2>
            <p className="mb-4 text-sm">Information collected from hotel owners, managers and their staff accounts:</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Business and Account Information</p>
                <p className="text-gray-500">Business name, registered address, contact name, email address and phone number. This information is used to verify your property and to contact you about your account and listings.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Property Information</p>
                <p className="text-gray-500">Hotel name, address, photos, room descriptions, pricing, amenities and availability data that you publish to your listing. This information is displayed publicly to guests.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Subscription and Billing Information</p>
                <p className="text-gray-500">Your chosen subscription plan and billing cycle. Payment processing is handled by Paddle. We retain transaction references and invoice history for accounting and legal purposes.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Dashboard Activity</p>
                <p className="text-gray-500">Actions you take within the management dashboard — room updates, reservation confirmations, pricing changes — logged for audit and security purposes.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Staff Accounts</p>
                <p className="text-gray-500">Names and email addresses of staff members you invite to manage the property dashboard, and their role assignments.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Information Collected Automatically</h2>
            <p className="mb-3 text-sm">Collected from all users regardless of account type:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Device data:</strong> IP address, browser type and version, operating system, screen resolution and device model.</li>
              <li><strong>Usage data:</strong> Pages visited, search queries entered, filters applied, time spent on pages, links clicked and features used.</li>
              <li><strong>Session data:</strong> Login times, session duration and logout events.</li>
              <li><strong>Referral data:</strong> The source that referred you to our platform, such as a search engine or link.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. How We Use Your Information</h2>

            <p className="font-semibold text-gray-900 mb-2 text-sm">For guests:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mb-5">
              <li>To process, confirm and manage your reservations.</li>
              <li>To send booking confirmations, pre-arrival information and check-out reminders by email.</li>
              <li>To share necessary booking details with the accommodation provider.</li>
              <li>To handle payment authorisation and issue receipts.</li>
              <li>To process refund requests and resolve booking disputes.</li>
              <li>To publish reviews you submit on property listings.</li>
              <li>To respond to your support queries.</li>
              <li>To detect and prevent fraudulent bookings.</li>
            </ul>

            <p className="font-semibold text-gray-900 mb-2 text-sm">For hotel partners:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mb-5">
              <li>To create and manage your property listing on the platform.</li>
              <li>To notify you of new reservations, cancellations and guest messages.</li>
              <li>To process subscription payments and generate invoices.</li>
              <li>To provide booking analytics and occupancy reports within your dashboard.</li>
              <li>To verify your property and maintain platform quality standards.</li>
              <li>To send account notices, product updates and billing alerts.</li>
            </ul>

            <p className="font-semibold text-gray-900 mb-2 text-sm">For all users:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To operate, maintain and improve the platform.</li>
              <li>To analyse usage patterns and improve search results.</li>
              <li>To detect security threats and prevent abuse.</li>
              <li>To comply with legal and regulatory obligations.</li>
            </ul>

            <p className="mt-4 text-sm">
              We do <strong>not</strong> sell your personal information. We do not use your data for targeted
              advertising or share it with data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. How We Share Your Information</h2>
            <p className="mb-3 text-sm">We share your information only where necessary to operate the platform:</p>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Accommodation Providers</p>
                <p className="text-gray-500">When you make a booking, we share your name, email address, phone number (if provided), check-in and check-out dates, number of guests and any special requests with the property so they can fulfill your reservation. Hotel partners do not receive your payment credentials.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Payment Processor (Paddle)</p>
                <p className="text-gray-500">All payments — both guest bookings and hotel partner subscriptions — are processed by Paddle. Paddle receives the information required to complete your transaction and operates under its own privacy policy. We do not receive or store your full card details.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Email Service (Resend)</p>
                <p className="text-gray-500">Used to deliver transactional emails: booking confirmations, invoices, receipts and account notifications. Resend processes only the email address and message content required to send each email.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Infrastructure (Supabase, AWS)</p>
                <p className="text-gray-500">Our database and application run on Supabase infrastructure hosted on AWS. Both operate under data processing agreements that require them to protect your data and prohibit them from using it for their own purposes.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Analytics (Google Analytics)</p>
                <p className="text-gray-500">We use Google Analytics to understand how the platform is used in aggregate. This does not identify you personally. You can opt out using the Google Analytics opt-out browser extension.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Law Enforcement and Regulators</p>
                <p className="text-gray-500">We disclose information when required by law, court order or government authority. Where permitted, we will notify you before disclosing your information.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Payment Data and Security</h2>
            <p>
              BookQayam does not process card payments directly. All payment transactions are handled by Paddle, which
              is a Payment Card Industry Data Security Standard (PCI DSS) compliant payment processor. Your card
              number, expiry date and CVV are entered directly into Paddle's secure form and never pass through
              our servers.
            </p>
            <p className="mt-3 text-sm">
              We retain the following payment records for each transaction: a Paddle transaction reference, the last
              four digits of the card used, the card network (e.g. Visa, Mastercard), the transaction amount and
              date, and the billing outcome (success or failure). These records are used to verify payment,
              issue refunds and respond to billing disputes.
            </p>
            <p className="mt-3 text-sm">
              If you believe a payment was taken from you in error, contact us at <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline">billing@bookqayam.com</a> with
              your booking reference and we will investigate within two business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data Security</h2>
            <p>
              All data transmitted between your device and our platform is encrypted using Transport Layer Security
              (TLS 1.2 or higher). Data at rest is stored on Supabase with row-level security policies that ensure
              each user can only read and write their own records. Production database access requires multi-factor
              authentication and is restricted to authorised personnel.
            </p>
            <p className="mt-3 text-sm">
              Hotel partner dashboard sessions use secure, short-lived tokens. Staff accounts have role-based access
              so that each team member can only access the data their role requires.
            </p>
            <p className="mt-3 text-sm">
              No system is completely secure. If you suspect your account has been compromised, change your password
              immediately and contact <a href="mailto:security@bookqayam.com" className="text-blue-600 hover:underline">security@bookqayam.com</a>.
              If we become aware of a data breach that affects your personal information, we will notify you by
              email without undue delay.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Data Retention</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Guest Accounts</p>
                <p className="text-gray-500">Kept for as long as your account is active. If you close your account, personal profile data is deleted within 30 days. Booking records are retained for 7 years to meet tax and accounting requirements.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Hotel Partner Accounts</p>
                <p className="text-gray-500">Kept for as long as the subscription is active. After account closure, business records and invoices are retained for 7 years. Property listing content is removed within 30 days of account closure.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Reviews</p>
                <p className="text-gray-500">Reviews you submit remain on the platform after your account is closed unless you request their removal before closing your account.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Support Correspondence</p>
                <p className="text-gray-500">Retained for 3 years after resolution to assist with any follow-up disputes.</p>
              </div>
            </div>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Cookies and Tracking</h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Essential Cookies</p>
                <p className="text-gray-500">Required for the platform to function. They keep you signed in, maintain your session and remember items in your booking flow. You cannot opt out of essential cookies and still use the platform.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Analytics Cookies</p>
                <p className="text-gray-500">Google Analytics cookies track page views and usage patterns in aggregate. They do not identify you personally. You can disable them in your browser settings or via the Google Analytics opt-out extension.</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900 mb-1">Preference Cookies</p>
                <p className="text-gray-500">Remember your search preferences, selected currency and language settings between visits.</p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              We do not use advertising cookies or cross-site tracking cookies.
            </p>
          </section>

          <section id="rights">
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Your Rights</h2>
            <p className="mb-3">You have the following rights over your personal information at any time:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Access:</strong> request a copy of all personal data we hold about you.</li>
              <li><strong>Correction:</strong> ask us to correct information that is inaccurate or incomplete.</li>
              <li><strong>Deletion:</strong> request deletion of your personal data, subject to our legal retention obligations. Booking records may be retained for the required 7-year period even after deletion of your account profile.</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format (JSON or CSV).</li>
              <li><strong>Restriction:</strong> ask us to pause processing while a concern is being investigated.</li>
              <li><strong>Objection:</strong> object to processing carried out on the basis of legitimate interests.</li>
              <li><strong>Withdraw Consent:</strong> where processing is based on consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.</li>
            </ul>
            <p className="mt-3 text-sm">
              Submit requests to <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline">privacy@bookqayam.com</a>.
              We respond within 30 days. We may ask you to verify your identity before acting on any request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Marketing Communications</h2>
            <p>
              We may send you promotional emails about BookQayam offers, new features or properties in cities you
              have searched for. You can unsubscribe from marketing emails at any time using the unsubscribe link
              in any email we send, or by updating your notification preferences in your account settings.
            </p>
            <p className="mt-3 text-sm">
              Unsubscribing from marketing emails does not stop transactional emails such as booking confirmations,
              receipts and account security notices, which we send regardless of your marketing preference.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Children</h2>
            <p>
              The platform is not intended for anyone under 18. We do not knowingly collect data from children.
              If you believe a child has registered or made a booking through our platform, contact us at
              <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline ml-1">privacy@bookqayam.com</a> and
              we will remove the information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Changes to This Policy</h2>
            <p>
              We will notify registered users by email at least 14 days before any material changes to this policy
              take effect. Minor clarifications may be made without notice. The effective date at the top of this
              page reflects when it was last updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Contact</h2>
            <p>For privacy questions, data requests or to report a concern:</p>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm space-y-1">
              <p className="font-semibold text-gray-900">BookQayam Privacy Team</p>
              <p className="text-gray-500">Privacy: <a href="mailto:privacy@bookqayam.com" className="text-blue-600 hover:underline">privacy@bookqayam.com</a></p>
              <p className="text-gray-500">Billing: <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline">billing@bookqayam.com</a></p>
              <p className="text-gray-500">Security: <a href="mailto:security@bookqayam.com" className="text-blue-600 hover:underline">security@bookqayam.com</a></p>
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
