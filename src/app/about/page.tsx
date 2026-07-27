import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { ArrowRight, Globe, Users, Star, Building2, ShieldCheck, Zap, HeartHandshake, BarChart3, Clock } from 'lucide-react'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'About BookQayam — Our Mission, Values & Hotel Platform Story',
  description:
    'Learn how BookQayam helps guests find verified hotels and gives hotel owners a fast, secure platform to manage bookings, rooms, payments and staff.',
  path: '/about',
})

const values = [
  { icon: Zap,           title: 'Speed first',        desc: 'Every action — check-in, payment, booking — should take seconds, not minutes.' },
  { icon: ShieldCheck,   title: 'Secure by default',  desc: 'Role-based access, encrypted data, and audit trails built into the core.' },
  { icon: HeartHandshake,title: 'Guest-obsessed',     desc: 'Every feature we ship improves the experience for the person checking in.' },
  { icon: BarChart3,     title: 'Data transparency',  desc: 'Hotel owners deserve clear, real-time visibility into their operations.' },
  { icon: Globe,         title: 'Built to scale',     desc: 'From a single boutique to a multi-city portfolio — the platform grows with you.' },
  { icon: Clock,         title: 'Always available',   desc: '99.9% uptime commitment with a support team that responds within the hour.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4">About BookQayam</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Making hospitality<br className="hidden sm:block" /> simple for everyone.
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            BookQayam is a hotel management and booking platform that helps guests find great stays and gives hotel owners the tools to run their property with confidence.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Our Mission</p>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-snug">
                Remove the friction between a great hotel and a happy guest.
              </h2>
              <p className="mt-5 text-gray-500 leading-relaxed">
                Too many hotels still run on paper registers, WhatsApp threads, and spreadsheets. We built BookQayam to change that — giving independent hotels and growing chains the same digital tools that enterprise hospitality companies use, without the enterprise price tag.
              </p>
              <p className="mt-4 text-gray-500 leading-relaxed">
                For guests, that means effortless discovery, instant booking, and a smooth stay. For Hotel Owners, it means total control from one screen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: 'Hotel owners',  desc: 'Manage rooms, bookings, staff, and payments' },
                { icon: Users,     label: 'Guests',        desc: 'Discover, compare, and book stays easily' },
                { icon: Star,      label: 'Reviews',       desc: 'Transparent feedback for every property' },
                { icon: Globe,     label: 'Everywhere',    desc: 'Accessible from any device, anywhere' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                    <Icon className="h-4.5 w-4.5 text-indigo-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">What we believe</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Ready to get started?</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Join hundreds of hotels already using BookQayam to manage their properties and delight their guests.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/hotel-management" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
