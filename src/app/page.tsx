import React from 'react'
import Link from 'next/link'
import {
  Building2, Users, CreditCard,
  CheckCircle2, Star, ArrowRight, TrendingUp, Clock,
  LayoutDashboard, CalendarCheck, Calendar, BedDouble,
  UserCog, FileBarChart, Settings, ShieldCheck, ChevronDown,
  BarChart3, Shield, Zap,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { createAdminClient } from '@/lib/supabase/server'
import WhatsAppButton from '@/components/WhatsAppButton'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal'
import { Marquee } from '@/components/motion/Marquee'
import { CountUp } from '@/components/motion/CountUp'
import { FeatureCards } from '@/components/landing/FeatureCards'

/* ─── Data ─────────────────────────────────────────────────────────────────── */


const stats: { count: number | null; fixed?: string; suffix?: string; label: string; icon: React.ElementType }[] = [
  { count: 14,   suffix: ' Days', label: 'Free trial — no card needed',          icon: Clock      },
  { count: null, fixed: '< 1 hr', label: 'Average hotel setup time',             icon: Zap        },
  { count: 100,  suffix: '%',     label: 'Data privacy — your data stays yours', icon: Shield     },
  { count: null, fixed: '24 / 7', label: 'Real-time room & booking updates',     icon: TrendingUp },
]

// ── Review helpers ───────────────────────────────────────────────────────────
const avatarColors = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-rose-600',  'bg-cyan-700',
]

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

type DbReview = {
  id: string
  rating: number
  comment: string
  created_at: string
  user: { full_name: string } | null
  hotel: { name: string } | null
}

const plans = [
  {
    name: 'Starter', price: '$29', period: '/mo',
    desc: 'Perfect for small independent hotels.',
    features: ['Up to 20 rooms', 'Room & booking management', 'Guest profiles', 'Basic reports', 'Email support'],
    cta: 'Start free trial', href: '/register-hotel', highlight: false,
  },
  {
    name: 'Professional', price: '$79', period: '/mo',
    desc: 'For growing hotels that need full power.',
    features: ['Unlimited rooms', 'Staff management & roles', 'Advanced analytics', 'Stripe payments', 'Priority support'],
    cta: 'Start free trial', href: '/register-hotel', highlight: true,
  },
  {
    name: 'Enterprise', price: '$199', period: '/mo',
    desc: 'For hotel groups and management companies.',
    features: ['Multi-property dashboard', 'Custom branding', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact sales', href: '/contact', highlight: false,
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
const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: CalendarCheck,   label: 'Bookings' },
  { icon: Calendar,        label: 'Calendar' },
  { icon: Users,           label: 'Guests' },
  { icon: BedDouble,       label: 'Rooms' },
  { icon: CreditCard,      label: 'Payments' },
  { icon: UserCog,         label: 'Staff' },
  { icon: FileBarChart,    label: 'Reports' },
  { icon: Settings,        label: 'Settings' },
]

const liveBookings = [
  { room: '101', guest: 'James Wilson', status: 'Checked In',     dot: 'bg-emerald-400' },
  { room: '204', guest: 'Maria Garcia', status: 'Checkout Today', dot: 'bg-amber-400'    },
  { room: '212', guest: 'Ava Clarke',   status: 'Checked In',     dot: 'bg-emerald-400' },
  { room: '305', guest: 'John Smith',   status: 'Arriving Today', dot: 'bg-violet-400'   },
]

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Main card */}
      <div className="flex bg-slate-800/90 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Sidebar */}
        <div className="hidden sm:flex w-36 flex-col bg-slate-900/60 border-r border-white/10 py-4 px-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-1 mb-4">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white text-sm font-bold">HotelOS</span>
          </div>
          <nav className="space-y-0.5">
            {sidebarLinks.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  active ? 'bg-blue-600 text-white' : 'text-white/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 min-w-0">
          <p className="text-sm font-bold text-white mb-3">Dashboard</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Occupancy', value: '87%',    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Revenue',   value: '$12.4k',  color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
              { label: 'Bookings',  value: '142',      color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-2.5`}>
                <p className={`text-base font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Live bookings + revenue overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Live Bookings</p>
              <div className="space-y-2">
                {liveBookings.map(b => (
                  <div key={b.room} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-white/40 flex-shrink-0">{b.room}</span>
                      <span className="text-[10px] text-white/70 truncate">{b.guest}</span>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.dot}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Revenue</p>
                <ChevronDown className="h-3 w-3 text-white/30" />
              </div>
              <p className="text-lg font-extrabold text-white">$48,290</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mb-2">
                <TrendingUp className="h-2.5 w-2.5" /> +12.5%
              </p>
              <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
                <polyline
                  points="0,22 15,18 30,24 45,12 60,16 75,6 100,2"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "New Booking" notification */}
      <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 w-52 animate-float">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">New Booking</p>
          <p className="text-xs text-gray-400">Room 202 · 2 nights</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Compact phone mockup (shown overlapping the hero dashboard) ──────────── */
function HeroPhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 132 }}>
      <div
        className="relative bg-slate-900 rounded-[24px] p-1.5"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.08)' }}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-black rounded-full z-10" />
        <div className="bg-slate-800 rounded-[18px] overflow-hidden px-2.5 pt-6 pb-2.5">
          <p className="text-white/50 text-[8px]">Good morning,</p>
          <p className="text-white font-bold text-xs mb-2">Admin</p>

          <div className="space-y-1.5">
            <div className="bg-white/10 rounded-lg px-2 py-1.5 flex items-center justify-between">
              <span className="text-white/60 text-[7px] leading-tight">Today&apos;s<br />Check-ins</span>
              <span className="text-white font-extrabold text-xs">12</span>
            </div>
            <div className="bg-white/10 rounded-lg px-2 py-1.5 flex items-center justify-between">
              <span className="text-white/60 text-[7px] leading-tight">Today&apos;s<br />Check-outs</span>
              <span className="text-white font-extrabold text-xs">8</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg px-2 py-1.5 mt-1.5 flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[7px] mb-0.5">Occupancy Rate</p>
              <p className="text-emerald-400 font-extrabold text-xs leading-none">87%</p>
              <p className="text-emerald-400 text-[7px] mt-0.5">+5.2%</p>
            </div>
            <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90 flex-shrink-0">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#34d399" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="12.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default async function LandingPage() {
  // Fetch published reviews from Supabase (service role bypasses RLS)
  const supabase = await createAdminClient()
  const { data: dbReviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, user:profiles(full_name), hotel:hotels(name)')
    .eq('is_published', true)
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(6)

  const liveReviews: DbReview[] = (dbReviews as DbReview[] | null) ?? []

  const avgRating = liveReviews.length
    ? (liveReviews.reduce((s, r) => s + r.rating, 0) / liveReviews.length).toFixed(1)
    : null

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

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <RevealGroup>
              <RevealItem>
                <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                  Run your hotel<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    smarter, not harder
                  </span>
                </h1>
              </RevealItem>

              <RevealItem>
                <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
                  The beautifully simple platform for rooms, bookings, staff, payments, and analytics. Set up in minutes, built to last for years.
                </p>
              </RevealItem>

              <RevealItem className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link
                  href="/register-hotel"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-blue-900/50 hover:-translate-y-0.5 hover:scale-[1.02] transform animate-pulse-glow"
                >
                  Register your hotel <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all"
                >
                  Sign in
                </Link>
              </RevealItem>

              <RevealItem className="flex flex-wrap gap-5">
                {[
                  { icon: CheckCircle2, label: 'No credit card needed' },
                  { icon: ShieldCheck,  label: '14-day free trial'     },
                  { icon: Clock,        label: 'Cancel anytime'        },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Icon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {label}
                  </span>
                ))}
              </RevealItem>
            </RevealGroup>

            {/* Right: dashboard + phone mockup over a night pool scene */}
            <Reveal delay={0.15} x={30} y={0} className="hidden lg:block relative pb-14">
              {/* Backdrop scene */}
              <div className="absolute -inset-8 rounded-[2rem] overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/80 to-slate-900" />
                {/* Lit hotel windows, right edge */}
                <div className="absolute right-0 top-0 bottom-0 w-2/5">
                  <div className="grid grid-cols-5 gap-1.5 p-4 h-full content-start pt-10">
                    {[1,0,1,1,0,0,1,1,1,0,0,1,0,1,1,0,1,0,0,1,1,1,0,1,0,0,1,1,0,1].map((lit, i) => (
                      <div key={i} className={`h-3 rounded-sm ${lit ? 'bg-amber-300/60' : 'bg-white/5'}`} />
                    ))}
                  </div>
                </div>
                {/* Palm silhouette */}
                <svg viewBox="0 0 60 100" className="absolute bottom-6 left-4 w-12 h-28 opacity-70 fill-slate-950">
                  <rect x="27" y="42" width="5" height="56" />
                  <path d="M30 44 C10 32 0 22 5 12 C15 22 25 32 30 44Z" />
                  <path d="M30 44 C50 32 60 22 55 12 C45 22 35 32 30 44Z" />
                  <path d="M30 44 C15 37 5 37 0 42 C10 47 22 48 30 44Z" />
                  <path d="M30 44 C45 37 55 37 60 42 C50 47 38 48 30 44Z" />
                </svg>
                {/* Pool water glow */}
                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-cyan-500/25 via-blue-500/10 to-transparent" />
              </div>

              {/* Dashboard card (phone mockup floats off its own bottom-left corner; pb-40 reserves room so the phone never collides with the feature strip below) */}
              <div className="relative z-10 pb-40">
                <DashboardMockup />
                <div className="absolute bottom-0 -left-6 z-20 animate-float-alt">
                  <HeroPhoneMockup />
                </div>
              </div>
            </Reveal>
          </div>

        </div>

        {/* Bottom wave */}
        <svg viewBox="0 0 1440 56" className="w-full fill-white block -mb-px" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C480,56 960,8 1440,32 L1440,56 L0,56 Z" />
        </svg>
      </section>

      {/* ══ Trust bar ═════════════════════════════════════════════════════════ */}
      <section className="py-10 border-b border-gray-100">
        <Reveal className="text-center mb-6 px-6">
          <p className="text-sm text-gray-400 font-medium">Everything your hotel needs in one platform</p>
        </Reveal>
        <Marquee />
      </section>

      {/* ══ How It Works ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Getting Started</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Register your hotel, configure your rooms, and start accepting bookings — all in one afternoon.
            </p>
          </Reveal>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[16.666%] right-[16.666%] h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

            <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-10" stagger={0.15}>
              {[
                {
                  step: '01',
                  icon: Building2,
                  title: 'Register Your Hotel',
                  desc: 'Create your account and add your hotel — name, location, amenities, contact details. Takes under 5 minutes.',
                  color: 'bg-blue-600',
                },
                {
                  step: '02',
                  icon: Users,
                  title: 'Set Up Rooms & Staff',
                  desc: 'Define room types, set pricing and availability, then invite your front desk and housekeeping team with role-based access.',
                  color: 'bg-blue-600',
                },
                {
                  step: '03',
                  icon: BarChart3,
                  title: 'Manage Everything',
                  desc: 'Accept bookings, track occupancy live, process payments via Stripe, and watch your revenue analytics grow.',
                  color: 'bg-blue-600',
                },
              ].map(({ step, icon: Icon, title, desc, color }) => (
                <RevealItem key={step} className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 ${color} rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-blue-600 text-blue-600 rounded-full text-xs font-extrabold flex items-center justify-center">
                      {step.replace('0', '')}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-3">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{desc}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal delay={0.2} className="mt-14 text-center">
            <Link
              href="/register-hotel"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-blue-200 hover:scale-[1.03] transform"
            >
              Register your hotel now <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-sm text-gray-400">14-day free trial · No credit card required</p>
          </Reveal>
        </div>
      </section>

      {/* ══ Features ══════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Everything in one place</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              No more jumping between tools. HotelOS brings your entire operation together.
            </p>
          </Reveal>

          <FeatureCards />
        </div>
      </section>

      {/* ══ Stats strip ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-blue-600">
        {/* Wave in from gray features section */}
        <svg viewBox="0 0 1440 56" className="w-full fill-blue-600 block" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: -1 }}>
          <path d="M0,28 C360,56 1080,0 1440,28 L1440,0 L0,0 Z" />
        </svg>
        <div className="py-20 px-6">
          <RevealGroup className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            {stats.map(({ count, fixed, suffix, label, icon: Icon }) => (
              <RevealItem key={label}>
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-extrabold text-white mb-1">
                  {count !== null
                    ? <CountUp to={count} suffix={suffix ?? ''} />
                    : fixed}
                </p>
                <p className="text-sm text-blue-200 font-medium">{label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
        {/* Wave out to white mobile section */}
        <svg viewBox="0 0 1440 56" className="w-full fill-white block -mb-px" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,28 C480,56 960,0 1440,28 L1440,56 L0,56 Z" />
        </svg>
      </section>

      {/* ══ Mobile App ════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Phone mockup */}
            <Reveal x={-30} y={0} className="flex justify-center lg:justify-end order-2 lg:order-1">
              <MobileAppMockup />
            </Reveal>

            {/* Text + QR */}
            <Reveal delay={0.15} x={30} y={0} className="order-1 lg:order-2">
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ Product Showcase ══════════════════════════════════════════════════ */}
      <Reveal>
        <ProductShowcase />
      </Reveal>

      {/* ══ Reviews ═══════════════════════════════════════════════════════════ */}
      <section id="reviews" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Reviews</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">What hoteliers say</h2>
            {avgRating && (
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                ))}
                <span className="ml-2 text-gray-500 font-medium text-sm">
                  {avgRating} / 5 from {liveReviews.length} verified review{liveReviews.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </Reveal>

          {liveReviews.length > 0 ? (
            <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveReviews.map((review, idx) => {
                const name = review.user?.full_name ?? 'Guest'
                const hotel = review.hotel?.name ?? ''
                const color = avatarColors[idx % avatarColors.length]
                const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return (
                  <RevealItem key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                      ))}
                      {Array.from({ length: 5 - review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-200 fill-gray-200" />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0`}>
                        {getInitials(name)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{name}</p>
                        {hotel && <p className="text-xs text-blue-600 font-medium">{hotel}</p>}
                        <p className="text-xs text-gray-400">{date}</p>
                      </div>
                    </div>
                  </RevealItem>
                )
              })}
            </RevealGroup>
          ) : (
            <p className="text-center text-gray-400 py-12">No reviews yet — be the first!</p>
          )}
        </div>
      </section>

      {/* ══ Pricing ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-gray-500">14-day free trial on every plan. No credit card required.</p>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {plans.map(plan => (
              <RevealItem
                key={plan.name}
                className={`rounded-2xl flex flex-col overflow-hidden transition-all hover:-translate-y-1 duration-300 ${
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
                    href={plan.href}
                    className={`block text-center font-bold py-3 rounded-xl text-sm transition-colors ${
                      plan.highlight
                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ══ Final CTA ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Wave in from white pricing section */}
        <svg viewBox="0 0 1440 56" className="w-full block" xmlns="http://www.w3.org/2000/svg" style={{ fill: '#0f172a', marginTop: -1 }}>
          <path d="M0,28 C360,0 1080,56 1440,28 L1440,0 L0,0 Z" />
        </svg>
        <div className="py-24 px-6 relative">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <Reveal className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to transform<br />your hotel operations?
            </h2>
            <p className="text-slate-300 text-lg mb-10">
              Set up your hotel in under an hour and start managing everything from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/register-hotel"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-9 py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-900/50 hover:scale-[1.03] transform animate-pulse-glow"
              >
                Register your hotel <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center border border-white/20 hover:bg-white/10 text-white font-semibold px-9 py-4 rounded-xl text-base transition-all"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Footer ════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <RevealItem className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-extrabold text-lg">HotelOS</span>
              </div>
              <p className="text-sm leading-relaxed">
                The modern hotel management platform for independent hotels and growing groups.
              </p>
            </RevealItem>

            {[
              {
                title: 'Product',
                links: [
                  { label: 'Features',     href: '/#features'     },
                  { label: 'How it works', href: '/#how-it-works' },
                  { label: 'Pricing',      href: '/#pricing'      },
                  { label: 'Reviews',      href: '/#reviews'      },
                ],
              },
              {
                title: 'Company',
                links: [
                  { label: 'Register Hotel', href: '/register-hotel' },
                  { label: 'Sign In',        href: '/login'          },
                  { label: 'Contact',        href: '/contact' },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy Policy',    href: '/privacy'         },
                  { label: 'Terms & Conditions', href: '/terms'           },
                  { label: 'Cookies',           href: '/privacy#cookies' },
                  { label: 'GDPR',              href: '/privacy#gdpr'    },
                ],
              },
            ].map(col => (
              <RevealItem key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.2} className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} HotelOS. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy#cookies" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </Reveal>
        </div>
      </footer>
      <WhatsAppButton />
    </div>
  )
}
