import Link from 'next/link'
import { Phone, Mail, MessageCircle, Clock, MapPin } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata = { title: 'Contact Us' }

const PHONE   = '+92 325 5258421'
const WA_LINK = 'https://wa.me/923255258421'
const EMAIL   = 'sales@n6solution.com'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4">Get in touch</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            We&apos;d love to hear from you
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Have a question about BookQayam? Reach out — we typically respond within a few hours.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-16 space-y-12">

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a href={`tel:${PHONE.replace(/\s/g, '')}`}
            className="group flex flex-col items-center text-center border border-gray-100 rounded-2xl p-8 hover:border-indigo-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
              <Phone className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Call us</h3>
            <p className="text-sm text-gray-400 mb-3">Mon – Sat, 10 am – 7 pm</p>
            <p className="text-indigo-600 font-semibold text-sm">{PHONE}</p>
          </a>

          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            className="group flex flex-col items-center text-center border border-gray-100 rounded-2xl p-8 hover:border-green-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
              <MessageCircle className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">WhatsApp</h3>
            <p className="text-sm text-gray-400 mb-3">Chat with us instantly</p>
            <p className="text-green-600 font-semibold text-sm">{PHONE}</p>
          </a>

          <a href={`mailto:${EMAIL}`}
            className="group flex flex-col items-center text-center border border-gray-100 rounded-2xl p-8 hover:border-indigo-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
              <Mail className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Email us</h3>
            <p className="text-sm text-gray-400 mb-3">We reply within 24 hours</p>
            <p className="text-indigo-600 font-semibold text-sm break-all">{EMAIL}</p>
          </a>
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-4 rounded-2xl bg-gray-50 border border-gray-100 px-6 py-5">
            <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1">Business Hours</p>
              <p className="text-sm text-gray-500">Monday – Saturday: 10:00 am – 7:00 pm PKT</p>
              <p className="text-sm text-gray-500">Sunday: Closed</p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-2xl bg-gray-50 border border-gray-100 px-6 py-5">
            <div className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm mb-1">Company</p>
              <p className="text-sm text-gray-500">N6 Solution SMC PVT LTD</p>
              <p className="text-sm text-gray-500">Pakistan</p>
            </div>
          </div>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
