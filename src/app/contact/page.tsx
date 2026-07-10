import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MessageCircle, Clock, MapPin } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'

export const metadata = { title: 'Contact Us' }

const PHONE    = '+92 352 5258421'
const WA_LINK  = 'https://wa.me/923525258421'
const EMAIL    = 'info@n6solution.com'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20 px-6 text-center">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Get in touch</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">We&apos;d love to hear from you</h1>
          <p className="text-slate-300 text-lg">
            Have a question about HotelOS? Reach out — we typically respond within a few hours.
          </p>
        </div>
        <svg viewBox="0 0 1440 56" className="w-full fill-white block absolute bottom-0 left-0" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C480,56 960,8 1440,32 L1440,56 L0,56 Z" />
        </svg>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-20">

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">

          {/* Phone */}
          <a
            href={`tel:${PHONE.replace(/\s/g, '')}`}
            className="group flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Phone className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Call us</h3>
            <p className="text-sm text-gray-400 mb-3">Mon – Sat, 9 am – 6 pm</p>
            <p className="text-blue-600 font-semibold">{PHONE}</p>
          </a>

          {/* WhatsApp */}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-green-500 group-hover:text-white transition-colors">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">WhatsApp</h3>
            <p className="text-sm text-gray-400 mb-3">Chat with us instantly</p>
            <p className="text-green-600 font-semibold">{PHONE}</p>
          </a>

          {/* Email */}
          <a
            href={`mailto:${EMAIL}`}
            className="group flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Email us</h3>
            <p className="text-sm text-gray-400 mb-3">We reply within 24 hours</p>
            <p className="text-violet-600 font-semibold break-all">{EMAIL}</p>
          </a>

        </div>

        {/* Info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-start gap-4 rounded-2xl bg-gray-50 border border-gray-100 px-6 py-5">
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-0.5">Business Hours</p>
              <p className="text-sm text-gray-500">Monday – Saturday: 9:00 am – 6:00 pm PKT</p>
              <p className="text-sm text-gray-500">Sunday: Closed</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-2xl bg-gray-50 border border-gray-100 px-6 py-5">
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <MapPin className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-0.5">Company</p>
              <p className="text-sm text-gray-500">N6 Solution</p>
              <p className="text-sm text-gray-500">Pakistan</p>
            </div>
          </div>
        </div>

      </main>

      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-400">
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
