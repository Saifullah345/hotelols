'use client'

import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { ArrowRight, Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-600">Contact</p>
          <h1 className="mt-3 text-4xl font-bold text-gray-900">Let’s build a better hotel experience together.</h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">Reach out for product tours, onboarding help, or custom hospitality workflows that fit your team.</p>
          <div className="mt-8 space-y-4 text-sm text-gray-600">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <Mail className="h-5 w-5 text-primary-600" />
              <span>hello@hotelos.example</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <Phone className="h-5 w-5 text-primary-600" />
              <span>+1 (555) 014-2050</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <MapPin className="h-5 w-5 text-primary-600" />
              <span>Dubai, UAE</span>
            </div>
          </div>
        </section>

        <section className="card p-8">
          <div className="rounded-3xl border border-primary-100 bg-primary-50 p-6">
            <h2 className="text-2xl font-semibold text-gray-900">Book a demo</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">Tell us about your property and we’ll help you discover the right setup for your team.</p>
            <div className="mt-6 space-y-3">
              <input className="input" placeholder="Your name" />
              <input className="input" placeholder="Email address" />
              <textarea className="input h-28 resize-none" placeholder="Tell us what you need" />
              <Link href="/register" className="btn-primary inline-flex">Request demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
