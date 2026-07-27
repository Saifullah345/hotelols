import Link from 'next/link'
import {
  BedDouble, CreditCard, Users, BarChart3,
  Bell, CheckCircle2, ArrowRight, ShieldCheck,
  CalendarDays, Receipt, ClipboardList, ChevronRight,
  Clock, Smartphone,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Hotel Management Software — Bookings, Rooms & Payments',
  description:
    'Run your entire property from one dashboard: bookings, room inventory, payments, staff roles and live reports. List your hotel on BookQayam for free.',
  path: '/hotel-management',
})

const FEATURES = [
  { icon: CalendarDays, title: 'Booking Management',      desc: 'Handle walk-in and online bookings in seconds. Assign rooms, set dates, and track every reservation from one screen.' },
  { icon: BedDouble,    title: 'Room Management',         desc: 'Add rooms, set room types, upload photos, and update availability in real time — no spreadsheets.' },
  { icon: CreditCard,   title: 'Payments & Receipts',     desc: 'Record advance and balance payments separately. Auto-generate professional receipts guests can save or print.' },
  { icon: Users,        title: 'Staff Accounts',          desc: 'Create staff logins with limited access. Front-desk can handle check-ins without touching financial reports.' },
  { icon: BarChart3,    title: 'Revenue Reports',         desc: 'Daily, weekly and monthly revenue summaries. Know your occupancy rate and top-earning room types at a glance.' },
  { icon: Bell,         title: 'Real-time Notifications', desc: 'Get instant alerts for new bookings, check-ins due today, and pending payments — so nothing slips through.' },
]

const STEPS = [
  { num: '01', title: 'Register your hotel',  desc: 'Fill in your hotel details, upload photos, and go live in under 10 minutes.' },
  { num: '02', title: 'Add your rooms',        desc: 'Create room types, set prices and availability. All rooms visible to guests instantly.' },
  { num: '03', title: 'Receive bookings',      desc: 'Accept online bookings from guests or record walk-ins directly from the dashboard.' },
  { num: '04', title: 'Manage & grow',         desc: 'Track payments, manage staff, view reports, and scale your business with confidence.' },
]


export default function HotelManagementPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4">For Hotel Owners</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Run your hotel smarter,<br className="hidden sm:block" /> not harder.
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            BookQayam gives independent hotels and guest houses a complete management system — bookings, rooms, payments, staff, and reports — all in one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register-hotel" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Sign in to dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required · Free to set up · Cancel any time</p>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-400">
            {['Bookings', 'Rooms', 'Payments', 'Staff', 'Reports', 'Receipts', 'Notifications'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Features</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Everything your hotel needs</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Built for independent hotels and boutique properties that want to work smarter without complex enterprise software.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-gray-100 p-6 hover:border-indigo-100 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">How it works</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Up and running in minutes</h2>
            <p className="mt-3 text-gray-500">No training needed. Just register, add your rooms and start taking bookings.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                <p className="text-4xl font-black text-indigo-100 mb-3">{step.num}</p>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-4 -right-3 h-5 w-5 text-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Why BookQayam</p>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-snug">Replace paper registers &amp; scattered spreadsheets.</h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Clock,         title: 'Save hours every day',          desc: 'Check in guests in under 30 seconds. No more hunting through notebooks.' },
                  { icon: Receipt,       title: 'Professional receipts instantly',desc: 'Auto-generated receipts for advance and final payments every time.' },
                  { icon: ClipboardList, title: 'Full audit trail',              desc: 'Every payment, booking change, and check-in is logged with timestamps.' },
                  { icon: Smartphone,    title: 'Works on any device',           desc: 'Manage your hotel from a phone, tablet or desktop — anywhere.' },
                  { icon: ShieldCheck,   title: 'Secure & reliable',             desc: 'Enterprise-grade security with daily backups — you never lose a record.' },
                ].map(b => (
                  <div key={b.title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <b.icon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{b.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '< 2 min', label: 'Average check-in time' },
                { value: '100%',    label: 'Payment accuracy' },
                { value: '24/7',    label: 'Access from anywhere' },
                { value: 'Free',    label: 'To register & get started' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
                  <p className="text-3xl font-black text-indigo-600 mb-1">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Ready to modernise your hotel?</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Join hundreds of hotel owners who have ditched paperwork for BookQayam. Takes under 10 minutes to set up.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register-hotel" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Register your hotel free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
