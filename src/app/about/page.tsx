'use client'

import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { ArrowRight, Building2, Sparkles, ShieldCheck } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50">
      <PublicNavbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <section className="card overflow-hidden p-8 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-600">About HotelOS</p>
              <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">Built for boutique hotels and growing hospitality teams.</h1>
              <p className="mt-5 text-lg leading-8 text-gray-600">We help properties simplify reservations, automate admin tasks, and deliver a polished experience for guests from booking to checkout.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-primary inline-flex">Start your free trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
                <Link href="/contact" className="btn-secondary inline-flex">Talk to us</Link>
              </div>
            </div>
            <div className="rounded-3xl border border-primary-100 bg-primary-600 p-8 text-white shadow-xl shadow-primary-100/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="mt-8 space-y-4 text-sm text-primary-50">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-semibold text-white">Operational clarity</p>
                  <p className="mt-1">One dashboard for rooms, bookings, staff permissions and payments.</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-semibold text-white">Guest-ready workflows</p>
                  <p className="mt-1">Beautiful booking journeys with instant confirmation and online payment support.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: 'Modern experience', desc: 'A calm and attractive interface designed to help hospitality teams move quickly.' },
            { icon: ShieldCheck, title: 'Secure by design', desc: 'Role-based access keeps admins, staff, and guests in the right workflow.' },
            { icon: Building2, title: 'Flexible growth', desc: 'Scale from a single property to a full multi-location portfolio.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{desc}</p>
            </div>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
