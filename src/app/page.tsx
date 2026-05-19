import Link from 'next/link'
import { Building2, Users, CreditCard, BarChart3, Shield, Zap } from 'lucide-react'

const features = [
  { icon: Building2, title: 'Hotel Management', desc: 'Full-featured hotel operations with rooms, bookings, and staff.' },
  { icon: Users, title: 'Multi-Tenant', desc: 'Isolated data per hotel with role-based access control.' },
  { icon: CreditCard, title: 'Payments', desc: 'Stripe integration for online and offline payments.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Revenue, occupancy, and booking trend dashboards.' },
  { icon: Shield, title: 'Secure', desc: 'Row-level security with tenant isolation on every query.' },
  { icon: Zap, title: 'Real-time', desc: 'Live updates powered by Supabase Realtime.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">HotelOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full mb-4">
            Multi-Tenant Hotel SaaS
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Manage Every Hotel<br />From One Platform
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            HotelOS gives you everything to run a hotel empire — bookings, rooms, staff, payments, and analytics — all in one secure, scalable platform.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="btn-primary px-8 py-3 text-base">Start Free Trial</Link>
            <Link href="/login" className="btn-secondary px-8 py-3 text-base">Sign In</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 mb-12">Choose the plan that fits your hotel size</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Basic', price: '$29', rooms: '20 rooms', features: ['Room management', 'Basic booking', 'Email support'] },
              { name: 'Pro', price: '$79', rooms: 'Unlimited rooms', features: ['All Basic features', 'Staff management', 'Analytics', 'Stripe payments'], highlight: true },
              { name: 'Enterprise', price: '$199', rooms: 'Unlimited', features: ['All Pro features', 'Multi-property', 'Priority support', 'Custom reports'] },
            ].map(plan => (
              <div key={plan.name} className={`card p-6 text-left ${plan.highlight ? 'border-primary-500 ring-2 ring-primary-200' : ''}`}>
                {plan.highlight && <span className="badge-blue mb-3">Most Popular</span>}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-sm text-primary-600 font-medium mb-4">{plan.rooms}</p>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-primary w-full text-center mt-6 block">Get Started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 px-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} HotelOS. All rights reserved.
      </footer>
    </div>
  )
}
