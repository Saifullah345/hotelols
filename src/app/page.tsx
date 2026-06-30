import Link from 'next/link'
import { ArrowRight, Building2, CalendarDays, ShieldCheck, Sparkles, Users, Wallet, BarChart3 } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

const features = [
  { icon: Building2, title: 'Hotel management', desc: 'Run rooms, bookings, and staff from one polished control center.' },
  { icon: CalendarDays, title: 'Smart bookings', desc: 'Streamline reservations with status tracking and confirmations in minutes.' },
  { icon: Wallet, title: 'Payments', desc: 'Collect guest payments securely with Stripe-powered workflows.' },
  { icon: BarChart3, title: 'Live analytics', desc: 'Monitor occupancy, revenue, and performance from a single dashboard.' },
  { icon: ShieldCheck, title: 'Secure by default', desc: 'Tenant-first data isolation keeps every property separate and protected.' },
  { icon: Sparkles, title: 'Modern experience', desc: 'Fast, elegant workflows for operators and guests alike.' },
]

const steps = [
  'Create your property and invite your team',
  'Set room inventory and pricing rules',
  'Accept bookings and send confirmations instantly',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-sky-50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                Multi-tenant hotel SaaS
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Run every property from one elegant platform.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                HotelOS helps operators manage bookings, rooms, teams, and payments with a calm, modern experience designed for growth.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary btn-lg inline-flex">
                  Start free trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/login" className="btn-secondary btn-lg inline-flex">
                  Sign in
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-primary-600" /> Teams of any size</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary-600" /> Secure guest and staff workflows</span>
              </div>
            </div>

            <div className="card overflow-hidden p-6 shadow-lg shadow-primary-100/60">
              <div className="rounded-2xl border border-gray-200 bg-slate-950 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Today&apos;s overview</p>
                    <p className="mt-1 text-3xl font-semibold">92% occupancy</p>
                  </div>
                  <div className="rounded-full bg-primary-500/20 px-3 py-1 text-sm font-medium text-primary-200">Live</div>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-sm text-slate-300">Pending bookings</p>
                    <p className="mt-2 text-2xl font-semibold">18</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-sm text-slate-300">Revenue</p>
                    <p className="mt-2 text-2xl font-semibold">$12.4k</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Everything your hotel team needs</h2>
            <p className="mt-4 text-lg text-gray-600">From front desk to finance, HotelOS keeps operations simple and transparent.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">How it works</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Launch faster with less busywork</h2>
              <p className="mt-4 text-lg text-gray-600">The platform is built to help teams move from setup to daily operations without friction.</p>
            </div>
            <div className="card p-8">
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Simple plans that scale as you grow</h2>
          <p className="mt-4 text-lg text-gray-600">Choose a plan that matches your property portfolio and team size.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: 'Starter', price: '$29', rooms: 'Up to 20 rooms', features: ['Room management', 'Booking center', 'Email support'] },
              { name: 'Growth', price: '$79', rooms: 'Unlimited rooms', features: ['All Starter features', 'Staff management', 'Analytics', 'Stripe payments'], highlight: true },
              { name: 'Enterprise', price: '$199', rooms: 'Unlimited', features: ['All Growth features', 'Multi-property', 'Priority support', 'Custom reporting'] },
            ].map(plan => (
              <div key={plan.name} className={`card p-6 text-left ${plan.highlight ? 'border-primary-500 ring-2 ring-primary-200' : ''}`}>
                {plan.highlight && <span className="badge-blue mb-3">Most popular</span>}
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="pb-1 text-sm text-gray-500">/month</span>
                </div>
                <p className="mt-3 text-sm font-medium text-primary-600">{plan.rooms}</p>
                <ul className="mt-5 space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-primary mt-6 block w-full text-center">Get started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-600 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Bring clarity to every stay.</h2>
          <p className="mt-4 text-lg text-primary-100">Launch faster, delight guests, and give your team a better operating rhythm.</p>
          <Link href="/register" className="btn-secondary mt-8 inline-flex bg-white text-primary-700 hover:bg-gray-50">Create account</Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
