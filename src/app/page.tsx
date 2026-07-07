import Link from 'next/link'
import {
  Building2, Users, CreditCard, BarChart3, Shield, Zap,
  CheckCircle2, Star, ArrowRight, TrendingUp, Clock,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const features = [
  { icon: Building2,  title: 'Room Management',     desc: 'Live room status, housekeeping queues, and maintenance requests — all from one screen.',                          glow: 'shadow-blue-500/40',    ring: 'bg-blue-500/10 text-blue-400'    },
  { icon: Users,      title: 'Staff & Roles',        desc: 'Role-based access for admins, front desk, and housekeeping. Everyone sees only what they need.',                  glow: 'shadow-violet-500/40',  ring: 'bg-violet-500/10 text-violet-400'},
  { icon: CreditCard, title: 'Payments',             desc: 'Online and walk-in payments via Stripe with automatic reconciliation and daily reports.',                         glow: 'shadow-emerald-500/40', ring: 'bg-emerald-500/10 text-emerald-400'},
  { icon: BarChart3,  title: 'Revenue Analytics',    desc: 'ADR, RevPAR, and occupancy trends. Spot problems and opportunities before they hit the bottom line.',             glow: 'shadow-amber-500/40',   ring: 'bg-amber-500/10 text-amber-400'  },
  { icon: Shield,     title: 'Enterprise Security',  desc: 'Row-level tenant isolation on every query. Your data stays yours — no cross-hotel leakage ever.',                glow: 'shadow-rose-500/40',    ring: 'bg-rose-500/10 text-rose-400'    },
  { icon: Zap,        title: 'Real-Time Updates',    desc: 'New bookings, check-ins, and task assignments appear instantly across every device on your team.',                glow: 'shadow-cyan-500/40',    ring: 'bg-cyan-500/10 text-cyan-400'    },
]

const stats = [
  { value: '500+',  label: 'Hotels',           icon: Building2  },
  { value: '2M+',   label: 'Bookings handled',  icon: TrendingUp },
  { value: '99.9%', label: 'Uptime SLA',         icon: Clock      },
  { value: '40%',   label: 'Faster operations',  icon: Zap        },
]

const reviews = [
  {
    name: 'Sarah Mitchell', role: 'GM, The Grand Meridian',
    rating: 5, initials: 'SM', color: 'bg-blue-600',
    text: 'HotelOS reduced our check-in time by 40 %. My team actually enjoys using it — that never happened with the old system.',
  },
  {
    name: 'Carlos Reyes', role: 'Owner, Boutique Stays Group',
    rating: 5, initials: 'CR', color: 'bg-violet-600',
    text: 'Running 12 properties used to feel impossible. Now I have everything in one view and can actually sleep at night.',
  },
  {
    name: 'Priya Nair', role: 'Revenue Manager, Skyline Hotels',
    rating: 5, initials: 'PN', color: 'bg-emerald-600',
    text: 'The analytics dashboard paid for the subscription in the first week. Found a pricing gap I had been missing for months.',
  },
]

const plans = [
  {
    name: 'Starter', price: '$29', period: '/mo',
    desc: 'Perfect for small independent hotels.',
    features: ['Up to 20 rooms', 'Room & booking management', 'Guest profiles', 'Basic reports', 'Email support'],
    cta: 'Start free trial', highlight: false,
  },
  {
    name: 'Professional', price: '$79', period: '/mo',
    desc: 'For growing hotels that need full power.',
    features: ['Unlimited rooms', 'Staff management & roles', 'Advanced analytics', 'Stripe payments', 'Priority support'],
    cta: 'Start free trial', highlight: true,
  },
  {
    name: 'Enterprise', price: '$199', period: '/mo',
    desc: 'For hotel groups and management companies.',
    features: ['Multi-property dashboard', 'Custom branding', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact sales', highlight: false,
  },
]

/* ─── Mobile app mockup ─────────────────────────────────────────────────────── */
const APP_BUILD_URL = 'https://expo.dev/accounts/saifullah79706/projects/hotel-saas-mobile/builds/5a276609-8977-408f-aed1-41516d41a8bb'

function MobileAppMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 260 }}>
      {/* Phone shell */}
      <div
        className="relative bg-slate-900 rounded-[44px] p-2.5"
        style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.06)' }}
      >
        {/* Dynamic island */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />

        {/* Screen */}
        <div className="bg-gray-50 rounded-[36px] overflow-hidden" style={{ height: 520 }}>
          {/* Status bar */}
          <div className="bg-slate-900 h-10 flex items-end justify-between px-6 pb-1.5">
            <span className="text-white text-xs font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end h-3">
                {[1, 1.5, 2, 3].map((h, i) => (
                  <div key={i} className="w-1 bg-white rounded-sm" style={{ height: `${h * 4}px` }} />
                ))}
              </div>
              <div className="w-4 h-2.5 rounded-sm border border-white/60 ml-1 relative">
                <div className="absolute inset-0.5 right-1 bg-white rounded-sm" />
              </div>
            </div>
          </div>

          {/* App header */}
          <div className="bg-blue-600 px-5 pt-4 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-200 text-xs">Good morning</p>
                <p className="text-white font-bold text-base">Grand Palace Hotel</p>
              </div>
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Occupied', value: '87%',   color: 'text-emerald-300' },
                { label: 'Bookings', value: '14',    color: 'text-blue-200'    },
                { label: 'Revenue',  value: '$4.2k', color: 'text-amber-300'   },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl px-2 py-2 text-center">
                  <p className={`text-sm font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Room list */}
          <div className="px-4 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Today&apos;s Rooms</p>
            <div className="space-y-2">
              {[
                { room: '101', guest: 'John Smith', status: 'Checked In', pill: 'bg-emerald-100 text-emerald-700' },
                { room: '204', guest: 'Anna Lee',   status: 'Checkout',   pill: 'bg-amber-100 text-amber-700'   },
                { room: '312', guest: 'Mike Ross',  status: 'Arriving',   pill: 'bg-blue-100 text-blue-700'     },
                { room: '405', guest: '—',          status: 'Available',  pill: 'bg-gray-100 text-gray-500'     },
              ].map(r => (
                <div key={r.room} className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm border border-gray-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">{r.room}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{r.guest}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.pill}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pt-2 pb-0.5">
          <div className="w-28 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute top-28 -right-1.5 w-1.5 h-16 bg-slate-700 rounded-r-lg" />
      <div className="absolute top-20 -left-1.5 w-1.5 h-10 bg-slate-700 rounded-l-lg" />
      <div className="absolute top-36 -left-1.5 w-1.5 h-10 bg-slate-700 rounded-l-lg" />
    </div>
  )
}

/* ─── Dashboard mockup (shown in hero) ─────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main card */}
      <div className="bg-slate-800/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border-b border-white/10">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-white/30 font-mono">HotelOS — Dashboard</span>
        </div>

        <div className="p-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Occupancy',  value: '87%',    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Revenue',    value: '$12.4k', color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
              { label: 'Bookings',   value: '142',    color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Room list */}
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Live rooms</p>
          <div className="space-y-2">
            {[
              { room: '101', guest: 'James Wilson',  status: 'Checked In',    dot: 'bg-emerald-400' },
              { room: '204', guest: 'Maria Garcia',  status: 'Checkout Today', dot: 'bg-amber-400'  },
              { room: '312', guest: 'Available',     status: 'Cleaning',       dot: 'bg-blue-400'   },
              { room: '405', guest: 'Alex Thompson', status: 'Arriving Today', dot: 'bg-violet-400' },
            ].map(r => (
              <div key={r.room} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-white/60">
                    {r.room}
                  </div>
                  <span className="text-sm text-white/70">{r.guest}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                  <span className="text-xs text-white/40">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 w-52">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">New Booking</p>
          <p className="text-xs text-gray-400">Room 205 · 3 nights</p>
        </div>
      </div>

      {/* Floating revenue card */}
      <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 w-44">
        <p className="text-xs text-gray-400 mb-0.5">This month</p>
        <p className="text-xl font-extrabold text-gray-900">$48,290</p>
        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
          <TrendingUp className="h-3 w-3" /> +18% vs last month
        </p>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ══ Nav — shared PublicNavbar (same as login/register pages) ══════════ */}
      <PublicNavbar />

      {/* ══ Hero ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Trusted by 500+ hotels worldwide
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Run your hotel<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  smarter, not harder
                </span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
                One beautifully simple platform for rooms, bookings, staff, payments, and analytics. Set up in minutes, built to last years.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-blue-900/50 hover:-translate-y-0.5 transform"
                >
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all"
                >
                  Sign in
                </Link>
              </div>

              <div className="flex flex-wrap gap-4">
                {['No credit card needed', '14-day free trial', 'Cancel anytime'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: dashboard mockup */}
            <div className="hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <svg viewBox="0 0 1440 56" className="w-full fill-white block -mb-px" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C480,56 960,8 1440,32 L1440,56 L0,56 Z" />
        </svg>
      </section>

      {/* ══ Trust bar ═════════════════════════════════════════════════════════ */}
      <section className="py-10 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-gray-400 font-medium mb-6">Powering hotel operations across the globe</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['The Grand Meridian', 'Boutique Stays Group', 'Skyline Hotels', 'Azure Resorts', 'City Suites', 'Harbor Inn Group'].map(name => (
              <span key={name} className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm font-medium text-gray-500">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Features ══════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Everything in one place</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              No more jumping between tools. HotelOS brings your entire operation together.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, ring }) => (
              <div
                key={title}
                className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 ${ring} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Stats strip ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label}>
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-4xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-sm text-blue-200 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Mobile App ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Phone mockup */}
            <div className="flex justify-center lg:justify-end order-2 lg:order-1">
              <MobileAppMockup />
            </div>

            {/* Text + QR */}
            <div className="order-1 lg:order-2">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Mobile App</p>
              <h2 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
                Manage your hotel<br />from your pocket
              </h2>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Real-time room updates, instant booking alerts, and staff management — anywhere, anytime.
              </p>

              <ul className="space-y-3 mb-10">
                {[
                  'Live room & booking status',
                  'Instant new-booking notifications',
                  'Staff task assignment on the go',
                  'Revenue dashboard at a glance',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-gray-700 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* QR code card — URL is encoded, not shown */}
              <div className="inline-flex items-center gap-5 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(APP_BUILD_URL)}&bgcolor=ffffff&color=1e3a8a&qzone=1`}
                    alt="Scan to install the HotelOS mobile app"
                    width={120}
                    height={120}
                    className="rounded-lg block"
                  />
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-base mb-1">Scan to install</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Point your phone camera<br />at the code to download<br />the HotelOS app.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Android &amp; iOS supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Reviews ═══════════════════════════════════════════════════════════ */}
      <section id="reviews" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Reviews</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Hoteliers love HotelOS</h2>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-gray-500 font-medium text-sm">4.9 / 5 from 200+ reviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map(({ name, role, rating, initials, color, text }) => (
              <div key={name} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">
                  &ldquo;{text}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0`}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Pricing ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-gray-500">14-day free trial on every plan. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl flex flex-col overflow-hidden transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-600 to-blue-700 shadow-2xl shadow-blue-200 md:-my-4'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="text-center text-xs font-extrabold tracking-widest uppercase text-blue-200 py-2 bg-blue-800/30">
                    Most Popular
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  <h3 className={`text-xl font-extrabold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-6 ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{plan.desc}</p>

                  <div className="flex items-baseline gap-1 mb-7">
                    <span className={`text-5xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-blue-200' : 'text-emerald-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`block text-center font-bold py-3 rounded-xl text-sm transition-colors ${
                      plan.highlight
                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Final CTA ═════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Ready to transform<br />your hotel operations?
          </h2>
          <p className="text-slate-300 text-lg mb-10">
            Join 500+ hoteliers already saving time and growing revenue.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-9 py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-900/50"
            >
              Start your free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-white/20 hover:bg-white/10 text-white font-semibold px-9 py-4 rounded-xl text-base transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ══ Footer ════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-extrabold text-lg">HotelOS</span>
              </div>
              <p className="text-sm leading-relaxed">
                The modern hotel management platform for independent hotels and growing groups.
              </p>
            </div>

            {[
              { title: 'Product',  links: ['Features', 'Pricing', 'Security', 'Integrations'] },
              { title: 'Company',  links: ['About', 'Blog', 'Careers', 'Contact']             },
              { title: 'Legal',    links: ['Privacy', 'Terms', 'Cookies', 'GDPR']             },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} HotelOS. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
