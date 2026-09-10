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
        <p className="text-sm text-gray-400 mb-4">Last updated: 1 September 2026</p>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-800 mb-12">
          <p className="font-semibold mb-1">Who these terms apply to</p>
          <p>These terms govern all use of BookQayam. Sections 1–10 apply to everyone. Sections 11–16 apply specifically to hotel owners and managers who list properties. Sections 17–24 apply to all users.</p>
        </div>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          {/* ===================== PART A: ALL USERS ===================== */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Part A — All Users</p>

            <div className="space-y-10">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance</h2>
                <p>
                  By accessing bookqayam.com or making a reservation through our platform, you confirm that you have
                  read, understood and agreed to these Terms and Conditions in full. If you do not agree, do not
                  use the platform.
                </p>
                <p className="mt-3 text-sm">
                  We may update these terms from time to time. Continued use of the platform after the updated
                  terms take effect constitutes your acceptance. We will notify registered users by email at least
                  14 days before material changes apply.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. What BookQayam Is</h2>
                <p>
                  BookQayam is an online marketplace that connects travellers with accommodation providers across
                  Pakistan. We act as an intermediary. When a reservation is confirmed, the accommodation contract
                  is formed directly between the guest and the hotel. BookQayam is not the hotel, is not a party
                  to the accommodation agreement and does not own or operate any of the listed properties.
                </p>
                <p className="mt-3 text-sm">
                  Accommodation providers are solely responsible for the accuracy of their listings, the quality
                  of their rooms and the fulfilment of confirmed reservations. BookQayam does not verify every
                  claim made in a listing but does take action when inaccuracies are reported.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. Accounts</h2>
                <p>
                  To make a reservation or list a property you must create a BookQayam account. You must be at
                  least 18 years old. The information you provide during registration must be accurate and kept
                  up to date.
                </p>
                <p className="mt-3 text-sm">
                  You are responsible for maintaining the confidentiality of your password and for all activity
                  that occurs under your account. Do not share your account credentials with anyone. If you
                  suspect unauthorised access, change your password immediately and notify us at
                  <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline ml-1">support@bookqayam.com</a>.
                </p>
                <p className="mt-3 text-sm">
                  One person may hold one guest account. Hotel partners may hold one partner account per business
                  entity and may invite staff members with defined roles under that account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Prohibited Conduct</h2>
                <p className="mb-3 text-sm">None of the following are permitted on BookQayam:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Creating fake accounts, fake reviews, fake listings or any form of fraudulent identity.</li>
                  <li>Attempting to gain unauthorised access to any account, system or database.</li>
                  <li>Using automated scripts, bots or scrapers to extract data from the platform without written permission.</li>
                  <li>Making reservations you do not intend to honour.</li>
                  <li>Facilitating transactions that bypass BookQayam's payment processing to avoid platform fees.</li>
                  <li>Posting content that is defamatory, abusive, discriminatory or violates any third-party rights.</li>
                  <li>Using the platform in a way that could damage its reputation or disrupt other users' access.</li>
                </ul>
                <p className="mt-3 text-sm">
                  Violations may result in immediate account suspension or termination without refund of any
                  subscription fees paid.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Intellectual Property</h2>
                <p>
                  All platform software, design, branding, logos and original written content produced by
                  BookQayam are protected by copyright. You may not reproduce, distribute or create derivative
                  works without our written permission.
                </p>
                <p className="mt-3 text-sm">
                  Content you upload — including reviews, photos and listing information — remains yours. By
                  uploading it you grant BookQayam a non-exclusive, royalty-free licence to display, reproduce
                  and distribute that content for the purpose of operating the platform.
                </p>
              </section>

            </div>
          </div>

          {/* ===================== PART B: GUESTS ===================== */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Part B — Guests and Travellers</p>

            <div className="space-y-10">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Making a Reservation</h2>
                <p>
                  When you submit a reservation request, you confirm that all information you have provided is
                  accurate, including guest names, arrival dates and any special requests. A booking confirmation
                  sent to your registered email is your proof of reservation.
                </p>
                <p className="mt-3 text-sm">
                  Room availability is provided in real time by the property. In rare cases a room may become
                  unavailable after your confirmation is issued. If this happens we will notify you as soon as
                  possible and offer either a full refund or an alternative room of equivalent standard and price.
                </p>
                <p className="mt-3 text-sm">
                  Reservations made on behalf of other guests are subject to the same terms. The account holder
                  is responsible for ensuring all guests comply with the property's rules during the stay.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">7. Payments</h2>
                <p>
                  Payments are processed securely by Paddle on our behalf. By completing a payment you authorise
                  Paddle to charge the amount shown at checkout to your chosen payment method. All prices include
                  applicable taxes and fees as shown before you confirm.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam does not store your card number, CVV or banking details. We retain only a transaction
                  reference, the last four digits of your card and the transaction amount.
                </p>
                <p className="mt-3 text-sm">
                  If a payment fails, your reservation will not be confirmed. You will receive an email asking
                  you to retry with a different payment method. An unconfirmed reservation does not guarantee
                  room availability.
                </p>
                <p className="mt-3 text-sm">
                  For payment queries, contact <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline">billing@bookqayam.com</a> with
                  your booking reference number.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cancellations and Refunds</h2>
                <p>
                  Each property sets its own cancellation policy, which is clearly displayed before you confirm
                  a reservation. By completing a booking you accept the cancellation terms in place for that
                  specific rate.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Free Cancellation Rates</p>
                    <p className="text-gray-500">You may cancel without charge up to the deadline stated on the booking. Cancellations after the deadline are treated as non-refundable, regardless of the reason for cancellation.</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Non-Refundable Rates</p>
                    <p className="text-gray-500">No refund is issued for cancellations, changes or no-shows under a non-refundable rate. These rates are typically offered at a lower price in exchange for this restriction.</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Partially Refundable Rates</p>
                    <p className="text-gray-500">A portion of the booking amount is refunded if cancelled by the stated deadline. The refundable amount is shown on the booking details screen before you confirm.</p>
                  </div>
                </div>
                <p className="mt-4 text-sm">
                  To cancel, sign in to your account, open your bookings and follow the cancellation steps.
                  Eligible refunds are returned to your original payment method within 7 to 14 business days
                  depending on your card issuer.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam does not issue refunds that exceed the amount charged for the booking, and is not
                  responsible for any consequential costs arising from a cancellation, such as travel or
                  connecting accommodation expenses.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">9. No-Shows and Early Check-Out</h2>
                <p>
                  If you do not arrive at the property on the scheduled check-in date and have not cancelled in
                  advance, the property may treat the booking as a no-show. No-shows are non-refundable
                  regardless of the rate booked.
                </p>
                <p className="mt-3 text-sm">
                  If you check out earlier than the scheduled check-out date, any unused nights are generally
                  non-refundable unless the property agrees otherwise at the time of early departure. Contact
                  the property directly to discuss early check-out arrangements before your stay ends.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">10. During Your Stay</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Follow the property's check-in and check-out times as communicated in your booking confirmation.</li>
                  <li>Comply with the property's house rules, including smoking, noise and pet policies.</li>
                  <li>Treat the property and its facilities with reasonable care. You are liable for any damage caused during your reservation period.</li>
                  <li>Report any issues with the room to the property's front desk during your stay. Raising a concern after check-out limits your ability to seek a resolution.</li>
                  <li>The number of guests occupying the room must not exceed the capacity stated in the booking.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">11. Reviews</h2>
                <p>
                  After checkout you may be invited to submit a review of your stay. Reviews must reflect your
                  genuine experience. You may not post reviews for properties where you did not complete a stay,
                  or submit reviews on behalf of others.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam reserves the right to remove reviews that contain abusive language, false statements
                  of fact or content that violates these terms. We do not remove reviews solely because a property
                  disagrees with the guest's opinion.
                </p>
              </section>

            </div>
          </div>

          {/* ===================== PART C: HOTEL PARTNERS ===================== */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Part C — Hotel Partners</p>

            <div className="space-y-10">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">12. Listing Your Property</h2>
                <p>
                  By creating a listing on BookQayam you confirm that you are the owner of the property or are
                  authorised by the owner to list it. You are responsible for the accuracy of all listing
                  content, including room descriptions, photos, rates, available amenities and any restrictions.
                </p>
                <p className="mt-3 text-sm">
                  Listing content must not misrepresent the property, use photos of a different property or
                  advertise amenities that are not available. BookQayam may suspend or remove listings that
                  generate repeated inaccuracy complaints.
                </p>
                <p className="mt-3 text-sm">
                  You must keep your availability calendar and room rates up to date. Reservations made based
                  on availability shown in your calendar are binding. If a room becomes unavailable after a
                  booking is confirmed, you are responsible for providing equivalent alternative accommodation
                  at no additional cost to the guest.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">13. Honouring Reservations</h2>
                <p>
                  All reservations confirmed through BookQayam must be honoured. You may not ask guests to
                  cancel so you can re-sell the room at a higher rate, or refuse check-in to a guest who holds
                  a valid confirmation.
                </p>
                <p className="mt-3 text-sm">
                  If you are unable to accommodate a confirmed guest — for example due to overbooking or
                  property damage — you must arrange alternative accommodation of equal or higher standard in
                  the same city at no cost to the guest, and notify BookQayam immediately. Repeated failures
                  to honour confirmed reservations will result in your listing being suspended.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">14. Guest Data</h2>
                <p>
                  Guest booking details shared with you by BookQayam — including names, contact information,
                  arrival dates and special requests — may be used only to fulfil the reservation. You may not
                  use this data for marketing, share it with third parties or retain it beyond what is necessary
                  for the stay and any post-stay tax or legal obligations.
                </p>
                <p className="mt-3 text-sm">
                  You must not contact guests to redirect future bookings away from the BookQayam platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">15. Subscription Plans and Billing</h2>
                <p>
                  Access to the BookQayam hotel management dashboard and listing tools requires an active paid
                  subscription. Subscriptions are billed at the start of each billing period — monthly or
                  annually depending on the plan you selected.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Free Trial</p>
                    <p className="text-gray-500">New hotel partners receive a free trial period as specified on the pricing page at the time of registration. No credit card is charged during the trial. If you do not cancel before the trial ends, your chosen plan will be activated and the first billing cycle charged.</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Auto-Renewal</p>
                    <p className="text-gray-500">Subscriptions renew automatically at the end of each billing cycle using the payment method on file. You will receive a renewal reminder by email before each charge.</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Failed Payments</p>
                    <p className="text-gray-500">If a subscription payment fails, we will retry it over a short period and notify you by email. If payment cannot be collected after the retry period, your account will be downgraded and your listing will be hidden from guests until payment is resolved.</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-gray-900 mb-1">Price Changes</p>
                    <p className="text-gray-500">We will give at least 30 days notice before changing subscription pricing. Continued use of the platform after that notice period constitutes acceptance of the new price.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">16. Subscription Cancellation and Refunds</h2>
                <p>
                  You may cancel your subscription at any time from your account settings. Cancellation takes
                  effect at the end of the current billing cycle. You retain access to the dashboard and your
                  listing until that date.
                </p>
                <p className="mt-3 text-sm">
                  Subscription fees are non-refundable once a billing period has started, except where required
                  by applicable law. If you cancel mid-cycle, no partial refund is issued for the unused days.
                </p>
                <p className="mt-3 text-sm">
                  Annual plan refunds: if you purchased an annual subscription and request cancellation within
                  14 days of the payment date and have not listed any active properties, you may request a
                  full refund by contacting <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline">billing@bookqayam.com</a>.
                </p>
              </section>

            </div>
          </div>

          {/* ===================== PART D: GENERAL ===================== */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">Part D — General</p>

            <div className="space-y-10">

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">17. Payment Disputes and Chargebacks</h2>
                <p>
                  If you believe a charge on your statement is incorrect, contact us at
                  <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline ml-1">billing@bookqayam.com</a> with
                  your booking or invoice reference before initiating a chargeback with your bank. We will
                  investigate and respond within two business days.
                </p>
                <p className="mt-3 text-sm">
                  Initiating a chargeback without first contacting us may result in your account being suspended
                  while the dispute is under review. If a chargeback is determined to be invalid after
                  investigation, you remain liable for the original amount plus any fees imposed by the
                  payment processor.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">18. Service Availability</h2>
                <p>
                  We aim to keep the platform available at all times but do not guarantee uninterrupted access.
                  We may take the platform offline for scheduled maintenance, security updates or emergency
                  fixes. Where possible we will give advance notice of planned downtime via email and a banner
                  on the site.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam is not liable for losses arising from service interruptions caused by third-party
                  infrastructure failures, internet outages or events outside our reasonable control.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">19. Disclaimers</h2>
                <p>
                  Accommodation listings on BookQayam are provided by hotel partners. We do not independently
                  verify every fact in every listing. Descriptions, photos, star ratings and amenity details
                  are the property's own representations.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam does not warrant that search results will meet your specific requirements, that rooms
                  will be exactly as described, or that any particular property will accept your reservation.
                  We provide the platform on an "as is" basis without warranties of any kind beyond those
                  required by law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">20. Limitation of Liability</h2>
                <p>
                  To the fullest extent permitted by law, BookQayam's total liability to you for any claim
                  arising from your use of the platform is limited to the amount you paid for the specific
                  transaction giving rise to the claim — either the booking amount or the subscription fee
                  for the current billing period.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam is not liable for: acts or omissions of accommodation providers; inaccurate listing
                  information; loss of enjoyment during a stay; travel costs or expenses arising from a
                  cancelled or changed reservation; or any indirect or consequential losses.
                </p>
                <p className="mt-3 text-sm">
                  Nothing in these terms limits our liability for death or personal injury caused by our
                  negligence, for fraud or for any other liability that cannot be excluded under applicable law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">21. Indemnification</h2>
                <p>
                  You agree to indemnify BookQayam and its employees against any claims, damages or expenses
                  (including reasonable legal fees) arising from your breach of these terms, your use of the
                  platform in violation of any law or third-party rights, or any content you post or upload.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">22. Termination</h2>
                <p>
                  You may close your account at any time by contacting <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline">support@bookqayam.com</a>.
                  Hotel partners wishing to close their account should first cancel their subscription to avoid
                  the next billing cycle being charged.
                </p>
                <p className="mt-3 text-sm">
                  BookQayam reserves the right to suspend or terminate any account without prior notice if we
                  reasonably believe the account has been used to commit fraud, violate these terms or cause
                  harm to other users. In such cases, outstanding subscription fees are not refunded.
                </p>
                <p className="mt-3 text-sm">
                  On termination, any active reservations remain binding. A guest with a confirmed reservation
                  under a terminated hotel account will be notified and offered an alternative property or
                  a full refund.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">23. Governing Law and Disputes</h2>
                <p>
                  These terms are governed by the laws of Pakistan. For any dispute arising from your use of
                  the platform, we ask that you contact us first to seek a resolution informally. If a dispute
                  cannot be resolved within 30 days of written notice, it will be referred to the courts of
                  Pakistan, which have exclusive jurisdiction.
                </p>
                <p className="mt-3 text-sm">
                  Consumer protection laws in your country of residence may grant you additional rights that
                  these terms do not affect.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">24. Contact</h2>
                <p>For questions about these terms or to submit a complaint:</p>
                <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm space-y-1">
                  <p className="font-semibold text-gray-900">BookQayam Support</p>
                  <p className="text-gray-500">General: <a href="mailto:support@bookqayam.com" className="text-blue-600 hover:underline">support@bookqayam.com</a></p>
                  <p className="text-gray-500">Billing: <a href="mailto:billing@bookqayam.com" className="text-blue-600 hover:underline">billing@bookqayam.com</a></p>
                  <p className="text-gray-500">Legal: <a href="mailto:legal@bookqayam.com" className="text-blue-600 hover:underline">legal@bookqayam.com</a></p>
                </div>
              </section>

            </div>
          </div>

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
