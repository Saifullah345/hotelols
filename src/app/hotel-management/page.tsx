import Link from 'next/link'
import {
  BedDouble, CreditCard, Users, BarChart3,
  Bell, CheckCircle2, ArrowRight, ShieldCheck,
  CalendarDays, Receipt, ClipboardList, ChevronRight,
  Clock, Smartphone, Gift, Check, X as XIcon,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { pageMetadata } from '@/lib/seo'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = pageMetadata({
  title: 'Hotel Management Software — Bookings, Rooms & Payments',
  description:
    'Run your entire property from one dashboard: bookings, room inventory, payments, staff roles and live reports. 14-day free trial, no credit card required.',
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

const FEATURE_FLAGS = [
  { key: 'feature_listing',          label: 'Website Listing'    },
  { key: 'feature_online_booking',   label: 'Online Booking'     },
  { key: 'feature_housekeeping',     label: 'Housekeeping'       },
  { key: 'feature_reviews',          label: 'Reviews'            },
  { key: 'feature_advanced_reports', label: 'Advanced Reports'   },
  { key: 'feature_api_access',       label: 'API Access'         },
  { key: 'feature_multi_property',   label: 'Multi-property'     },
]

type Plan = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  max_rooms: number
  max_staff: number
  features: string[]
  trial_days: number
  tier_rank: number | null
  feature_listing: boolean
  feature_online_booking: boolean
  feature_housekeeping: boolean
  feature_reviews: boolean
  feature_advanced_reports: boolean
  feature_api_access: boolean
  feature_multi_property: boolean
}

async function getPlans(): Promise<Plan[]> {
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('plans')
    .select(`
      id, name, price_monthly, price_yearly, max_rooms, max_staff,
      features, trial_days, tier_rank,
      feature_listing, feature_online_booking, feature_housekeeping,
      feature_reviews, feature_advanced_reports, feature_api_access,
      feature_multi_property
    `)
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })
  return (data ?? []) as Plan[]
}

function formatLimit(val: number) {
  return val === -1 ? 'Unlimited' : String(val)
}

function formatPrice(n: number) {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`
}

export default async function HotelManagementPage() {
  const plans = await getPlans()
  // Mark the plan nearest the middle as "most popular"
  const popularIdx = plans.length > 1 ? Math.floor(plans.length / 2) : 0

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28 text-center">
          {/* Free trial badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
            <Gift className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">14-day free trial — no credit card required</span>
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4">For Hotel Owners</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Run your hotel smarter,<br className="hidden sm:block" /> not harder.
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            A complete management system — bookings, rooms, payments, staff, and reports — all in one place. Try any plan free for 14 days.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register-hotel" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Register your hotel <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login?role=hotel" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Hotel owner sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">14 days free on every plan · Cancel any time · No credit card needed to start</p>
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
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Features</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Everything your hotel needs</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Built for independent hotels and boutique properties that want to work smarter without complex enterprise software.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-indigo-100 hover:shadow-sm transition-all">
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
      <section className="border-b border-gray-100 bg-white">
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
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Why Hotelos</p>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-snug">Replace paper registers &amp; scattered spreadsheets.</h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: Clock,         title: 'Save hours every day',           desc: 'Check in guests in under 30 seconds. No more hunting through notebooks.' },
                  { icon: Receipt,       title: 'Professional receipts instantly', desc: 'Auto-generated receipts for advance and final payments every time.' },
                  { icon: ClipboardList, title: 'Full audit trail',               desc: 'Every payment, booking change, and check-in is logged with timestamps.' },
                  { icon: Smartphone,    title: 'Works on any device',            desc: 'Manage your hotel from a phone, tablet or desktop — anywhere.' },
                  { icon: ShieldCheck,   title: 'Secure & reliable',              desc: 'Enterprise-grade security with daily backups — you never lose a record.' },
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
                { value: '14 days', label: 'Free trial on every plan' },
                { value: '< 2 min', label: 'Average check-in time' },
                { value: '24/7',    label: 'Access from anywhere' },
                { value: '100%',    label: 'Payment accuracy' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
                  <p className="text-3xl font-black text-indigo-600 mb-1">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Pricing</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Every plan includes a <span className="font-semibold text-emerald-600">14-day free trial</span>. Pick the size that fits your property — upgrade any time.
            </p>
          </div>

          {/* Free trial banner */}
          <div className="flex items-center justify-center gap-3 mb-10 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 max-w-xl mx-auto">
            <Gift className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              <span className="font-bold">14 days free</span> on every plan. No credit card required. Full access from day one.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Plans coming soon — contact us for pricing.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              plans.length === 1 ? 'max-w-sm mx-auto' :
              plans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' :
              plans.length === 3 ? 'sm:grid-cols-3' :
              'sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {plans.map((plan, i) => {
                const isPopular   = i === popularIdx && plans.length > 1
                const yearlyMonthly = plan.price_yearly / 12
                const yearlySaving = Math.round((1 - yearlyMonthly / plan.price_monthly) * 100)
                const featureList  = Array.isArray(plan.features) ? plan.features : []

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border flex flex-col ${
                      isPopular
                        ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                        : 'border-gray-200'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white whitespace-nowrap">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className={`p-6 rounded-t-2xl ${isPopular ? 'bg-indigo-600' : 'bg-gray-50'}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isPopular ? 'text-indigo-200' : 'text-indigo-500'}`}>
                        {plan.name}
                      </p>
                      <div className="flex items-end gap-1 mt-2">
                        <span className={`text-4xl font-black ${isPopular ? 'text-white' : 'text-gray-900'}`}>
                          {formatPrice(plan.price_monthly)}
                        </span>
                        <span className={`text-sm mb-1 ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>/month</span>
                      </div>
                      {plan.price_yearly > 0 && yearlySaving > 0 && (
                        <p className={`text-xs mt-1 ${isPopular ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {formatPrice(plan.price_yearly)}/yr{' '}
                          <span className={`font-semibold ${isPopular ? 'text-emerald-300' : 'text-emerald-600'}`}>
                            save {yearlySaving}%
                          </span>
                        </p>
                      )}
                      {/* Trial pill */}
                      <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPopular ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Gift className="h-3 w-3" />
                        {plan.trial_days > 0 ? `${plan.trial_days}-day free trial` : 'No trial'}
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1 gap-5">
                      {/* Limits */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-black text-indigo-600">{formatLimit(plan.max_rooms)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Rooms</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                          <p className="text-lg font-black text-indigo-600">{formatLimit(plan.max_staff)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Staff accounts</p>
                        </div>
                      </div>

                      {/* Feature flags */}
                      <ul className="space-y-2">
                        {FEATURE_FLAGS.map(f => {
                          const enabled = plan[f.key as keyof Plan] as boolean
                          return (
                            <li key={f.key} className={`flex items-center gap-2.5 text-sm ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                              {enabled
                                ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                : <XIcon className="h-4 w-4 shrink-0" />}
                              {f.label}
                            </li>
                          )
                        })}
                      </ul>

                      {/* Extra features from DB */}
                      {featureList.length > 0 && (
                        <ul className="space-y-1.5 border-t border-gray-100 pt-4">
                          {featureList.map((feat: string) => (
                            <li key={feat} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-auto pt-2">
                        <Link
                          href="/register-hotel"
                          className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            isPopular
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          Start {plan.trial_days > 0 ? `${plan.trial_days}-day` : ''} free trial
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <p className="text-center text-xs text-gray-400 mt-2">No credit card required</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
            <Gift className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">14-day free trial — start today</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Ready to modernise your hotel?</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Try any plan free for 14 days. No credit card required. Full access from day one.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register-hotel" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Register your hotel <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login?role=hotel" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
