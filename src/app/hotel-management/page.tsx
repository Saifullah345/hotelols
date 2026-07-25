import Link from 'next/link'
import {
  Building2, BedDouble, CreditCard, Users, BarChart3,
  Bell, CheckCircle2, ArrowRight, Star, ShieldCheck,
  CalendarDays, Receipt, ClipboardList, ChevronRight,
  Clock, TrendingUp, Smartphone,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

const FEATURES = [
  {
    icon: CalendarDays,
    color: 'bg-blue-50 text-blue-600',
    title: 'Booking Management',
    desc: 'Handle walk-in and online bookings in seconds. Assign rooms, set dates, and track every reservation from one screen.',
  },
  {
    icon: BedDouble,
    color: 'bg-violet-50 text-violet-600',
    title: 'Room Management',
    desc: 'Add rooms, set room types, upload photos, and update availability status in real time — no spreadsheets.',
  },
  {
    icon: CreditCard,
    color: 'bg-green-50 text-green-600',
    title: 'Payments & Receipts',
    desc: 'Record advance and balance payments separately. Auto-generate professional receipts guests can save or print.',
  },
  {
    icon: Users,
    color: 'bg-orange-50 text-orange-600',
    title: 'Staff Accounts',
    desc: 'Create staff logins with limited access. Front-desk can handle check-ins without touching financial reports.',
  },
  {
    icon: BarChart3,
    color: 'bg-pink-50 text-pink-600',
    title: 'Revenue Reports',
    desc: 'Daily, weekly and monthly revenue summaries. Know your occupancy rate and top-earning room types at a glance.',
  },
  {
    icon: Bell,
    color: 'bg-yellow-50 text-yellow-600',
    title: 'Real-time Notifications',
    desc: 'Get instant alerts for new bookings, check-ins due today, and pending payments — so nothing slips through.',
  },
]

const STEPS = [
  { num: '01', title: 'Register your hotel', desc: 'Fill in your hotel details, upload photos, and go live in under 10 minutes.' },
  { num: '02', title: 'Add your rooms', desc: 'Create room types, set prices and availability. All rooms visible to customers instantly.' },
  { num: '03', title: 'Receive bookings', desc: 'Accept online bookings from guests or record walk-ins directly from the dashboard.' },
  { num: '04', title: 'Manage & grow', desc: 'Track payments, manage staff, view reports, and scale your business with confidence.' },
]

const TESTIMONIALS = [
  { name: 'Asad Malik', hotel: 'Pearl Continental, Lahore', rating: 5, text: 'Switched from paper registers to StayQayam in one day. Booking management is now ten times faster and guests love the receipts.' },
  { name: 'Sara Khan', hotel: 'City Suites, Karachi', rating: 5, text: 'The payment tracking is exactly what we needed. Advance and balance receipts are generated automatically — our accountant is happy.' },
  { name: 'Bilal Ahmed', hotel: 'Mountain View Inn, Murree', rating: 5, text: 'Staff accounts saved us a headache. Receptionists can do check-ins without seeing our revenue reports. Perfect access control.' },
]

export default function HotelManagementPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 text-white">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-primary-300 mb-6">
            <Building2 className="h-3.5 w-3.5" /> Hotel Management Software
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Run your hotel{' '}
            <span className="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
              smarter
            </span>
            , not harder
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            StayQayam gives independent hotels and guest houses a complete management system — bookings, rooms, payments, staff, and reports — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register-hotel"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary-900/30 transition-all hover:scale-[1.02]"
            >
              Start for Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-3.5 text-base font-semibold text-white transition-colors"
            >
              Sign In to Dashboard
            </Link>
          </div>

          <p className="mt-5 text-xs text-gray-500">No credit card required · Free to set up · Cancel any time</p>

          {/* Mock dashboard preview */}
          <div className="mt-16 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-2xl">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-gray-500 font-mono">hotel-admin / dashboard</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Revenue Today', value: 'Rs 42,500', icon: TrendingUp, color: 'text-green-400' },
                { label: 'Active Bookings', value: '14',       icon: CalendarDays, color: 'text-blue-400' },
                { label: 'Rooms Available', value: '6 / 22',  icon: BedDouble, color: 'text-violet-400' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/5 border border-white/8 p-3 text-left">
                  <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos / trust strip ────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-semibold text-gray-400">
            {['Bookings', 'Rooms', 'Payments', 'Staff', 'Reports', 'Receipts', 'Notifications'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Everything your hotel needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Built for independent hotels, guesthouses and boutique properties that want to work smarter without complex enterprise software.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Up and running in minutes</h2>
            <p className="text-gray-500">No training needed. Just register, add your rooms and start taking bookings.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="text-4xl font-black text-primary-100 mb-3 leading-none">{step.num}</div>
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

      {/* ── Key benefits ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Replace paper registers &amp; scattered spreadsheets</h2>
              <div className="space-y-5">
                {[
                  { icon: Clock, title: 'Save hours every day', desc: 'Check in guests in under 30 seconds. No more hunting through notebooks for booking details.' },
                  { icon: Receipt, title: 'Professional receipts instantly', desc: 'Auto-generated receipts for advance payments and final balances. Guests get a proper document every time.' },
                  { icon: ClipboardList, title: 'Full audit trail', desc: 'Every payment, booking change, and check-in is logged with timestamps. Perfect for accountability.' },
                  { icon: Smartphone, title: 'Works on any device', desc: 'Fully responsive — manage your hotel from a phone, tablet or desktop, anywhere you have internet.' },
                  { icon: ShieldCheck, title: 'Secure & reliable', desc: 'Your data is protected with enterprise-grade security. Daily backups mean you never lose a record.' },
                ].map(b => (
                  <div key={b.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <b.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{b.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats block */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '< 2 min', label: 'Average check-in time', color: 'border-primary-100 bg-primary-50' },
                { value: '100%', label: 'Payment accuracy', color: 'border-green-100 bg-green-50' },
                { value: '24 / 7', label: 'Access from anywhere', color: 'border-blue-100 bg-blue-50' },
                { value: 'Free', label: 'To register & get started', color: 'border-violet-100 bg-violet-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border ${s.color} p-6 text-center`}>
                  <p className="text-3xl font-black text-gray-900 mb-1">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Loved by hotel owners</h2>
            <p className="text-gray-500">Real feedback from properties using StayQayam every day.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.hotel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Building2 className="h-12 w-12 text-primary-600 mx-auto mb-5" />
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Ready to modernise your hotel?</h2>
          <p className="text-gray-500 mb-8 text-lg">
            Join hundreds of hotel owners who have ditched paperwork for StayQayam. Takes under 10 minutes to set up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register-hotel"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 px-8 py-3.5 text-base font-bold text-white shadow-md transition-all"
            >
              Register Your Hotel Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
