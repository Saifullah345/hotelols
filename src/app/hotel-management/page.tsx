import Link from 'next/link'
import Image from 'next/image'
import {
  BedDouble, CreditCard, Users, BarChart3,
  Bell, CheckCircle2, ArrowRight, ShieldCheck,
  CalendarDays, Receipt, ClipboardList,
  Clock, Smartphone, Gift, Check, X as XIcon,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import StepsCarousel from './StepsCarousel'
import { pageMetadata } from '@/lib/seo'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = pageMetadata({
  title: 'Hotel Management Software — Bookings, Rooms & Payments',
  description:
    'Run your entire property from one dashboard: bookings, room inventory, payments, staff roles and live reports. 14-day free trial, no credit card required.',
  path: '/hotel-management',
})

// Hero backdrop. Swap for your own shot by dropping the file in public/ and
// pointing at it ('/owners-hero.jpg'); images.unsplash.com is already allowed in
// next.config.ts remotePatterns. Kept dark and free of recognisable faces — the
// headline sits on top of it.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1800&q=70'

const FEATURES = [
  { icon: CalendarDays, title: 'Booking Management',      desc: 'Handle walk-in and online bookings in seconds. Assign rooms, set dates, and track every reservation from one screen.' },
  { icon: BedDouble,    title: 'Room Management',         desc: 'Add rooms, set room types, upload photos, and update availability in real time — no spreadsheets.' },
  { icon: CreditCard,   title: 'Payments & Receipts',     desc: 'Record advance and balance payments separately. Auto-generate professional receipts guests can save or print.' },
  { icon: Users,        title: 'Staff Accounts',          desc: 'Create staff logins with limited access. Front-desk can handle check-ins without touching financial reports.' },
  { icon: BarChart3,    title: 'Revenue Reports',         desc: 'Daily, weekly and monthly revenue summaries. Know your occupancy rate and top-earning room types at a glance.' },
  { icon: Bell,         title: 'Real-time Notifications', desc: 'Get instant alerts for new bookings, check-ins due today, and pending payments — so nothing slips through.' },
]

const BENEFITS = [
  { icon: Clock,         title: 'Save hours every day',            desc: 'Check in guests in under 30 seconds. No more hunting through notebooks.' },
  { icon: Receipt,       title: 'Professional receipts instantly', desc: 'Auto-generated receipts for advance and final payments every time.' },
  { icon: ClipboardList, title: 'Full audit trail',                desc: 'Every payment, booking change and check-in is logged with timestamps.' },
  { icon: Smartphone,    title: 'Works on any device',             desc: 'Manage your hotel from a phone, tablet or desktop — anywhere.' },
  { icon: ShieldCheck,   title: 'Secure & reliable',               desc: 'Enterprise-grade security with daily backups — you never lose a record.' },
]

const PAPERWORK = [
  'Registers rewritten by hand every day',
  'Receipts scribbled on a pad, or skipped',
  'Availability guessed from memory',
  'Revenue added up at month end, if at all',
  'Records lost when a notebook goes missing',
  'No idea which room type actually earns',
]

const STATS = [
  { value: '14 days', label: 'Free trial on every plan' },
  { value: '< 2 min', label: 'Average check-in time' },
  { value: '24/7',    label: 'Access from anywhere' },
  { value: '100%',    label: 'Payment accuracy' },
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

/** One pricing card. `highlighted` is the filled indigo treatment. */
function PlanCard({ plan, highlighted }: { plan: Plan; highlighted: boolean }) {
  const yearlyMonthly = plan.price_yearly / 12
  const yearlySaving = plan.price_monthly > 0
    ? Math.round((1 - yearlyMonthly / plan.price_monthly) * 100)
    : 0
  const extras = Array.isArray(plan.features) ? plan.features : []

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 ${
        highlighted
          ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-200'
          : 'border border-gray-200 bg-white'
      }`}
    >
      {plan.trial_days > 0 && (
        <span
          className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            highlighted ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          Free trial
        </span>
      )}

      <p className={`text-sm font-semibold ${highlighted ? 'text-primary-100' : 'text-gray-500'}`}>
        {plan.name}
      </p>

      <div className="mt-2 flex items-end gap-1">
        <span className={`text-5xl font-black ${highlighted ? 'text-white' : 'text-gray-900'}`}>
          {formatPrice(plan.price_monthly)}
        </span>
        <span className={`mb-2 text-sm ${highlighted ? 'text-primary-200' : 'text-gray-400'}`}>/month</span>
      </div>

      {plan.price_yearly > 0 && yearlySaving > 0 && (
        <p className={`mt-1 text-xs ${highlighted ? 'text-primary-200' : 'text-gray-400'}`}>
          {formatPrice(plan.price_yearly)}/yr
          <span className={`ml-1 font-semibold ${highlighted ? 'text-emerald-200' : 'text-emerald-600'}`}>
            save {yearlySaving}%
          </span>
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className={`rounded-xl px-3 py-2.5 text-center ${highlighted ? 'bg-white/10' : 'bg-gray-50'}`}>
          <p className={`text-lg font-black ${highlighted ? 'text-white' : 'text-primary-600'}`}>
            {formatLimit(plan.max_rooms)}
          </p>
          <p className={`mt-0.5 text-xs ${highlighted ? 'text-primary-100' : 'text-gray-500'}`}>Rooms</p>
        </div>
        <div className={`rounded-xl px-3 py-2.5 text-center ${highlighted ? 'bg-white/10' : 'bg-gray-50'}`}>
          <p className={`text-lg font-black ${highlighted ? 'text-white' : 'text-primary-600'}`}>
            {formatLimit(plan.max_staff)}
          </p>
          <p className={`mt-0.5 text-xs ${highlighted ? 'text-primary-100' : 'text-gray-500'}`}>Staff accounts</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {FEATURE_FLAGS.map(flag => {
          const enabled = plan[flag.key as keyof Plan] as boolean
          return (
            <li
              key={flag.key}
              className={`flex items-center gap-2.5 text-sm ${
                highlighted
                  ? enabled ? 'text-white' : 'text-primary-300'
                  : enabled ? 'text-gray-700' : 'text-gray-300'
              }`}
            >
              {enabled
                ? <Check className={`h-4 w-4 shrink-0 ${highlighted ? 'text-emerald-300' : 'text-emerald-500'}`} aria-hidden="true" />
                : <XIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {flag.label}
            </li>
          )
        })}
      </ul>

      {extras.length > 0 && (
        <ul className={`mt-4 space-y-1.5 border-t pt-4 ${highlighted ? 'border-white/20' : 'border-gray-100'}`}>
          {extras.map(feat => (
            <li
              key={feat}
              className={`flex items-start gap-2 text-sm ${highlighted ? 'text-primary-100' : 'text-gray-600'}`}
            >
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? 'text-emerald-300' : 'text-primary-400'}`} aria-hidden="true" />
              {feat}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <Link
          href="/register-hotel"
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            highlighted
              ? 'bg-white text-primary-700 hover:bg-primary-50'
              : 'border border-primary-200 text-primary-600 hover:bg-primary-50'
          }`}
        >
          Register now
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className={`mt-2 text-center text-xs ${highlighted ? 'text-primary-200' : 'text-gray-400'}`}>
          No credit card required
        </p>
      </div>
    </div>
  )
}

export default async function HotelManagementPage() {
  const plans = await getPlans()
  // The middle plan carries the highlight, as before.
  const popularIdx = plans.length > 1 ? Math.floor(plans.length / 2) : 0

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden bg-gray-900">
        <div className="absolute inset-0 -z-10">
          <Image src={HERO_IMAGE} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-950/60" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5">
              <Gift className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              <span className="text-sm font-semibold text-emerald-200">
                14-day free trial — no credit card required
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Run your hotel smarter,<br className="hidden sm:block" /> not harder.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
              A complete management system — bookings, rooms, payments, staff and reports — all in
              one place. Try any plan free for 14 days.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register-hotel"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
              >
                Sign up now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore the features
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              14 days free on every plan · Cancel any time · No credit card needed to start ·{' '}
              <Link href="/login?role=hotel" className="font-semibold text-gray-300 underline-offset-2 hover:underline">
                Already registered? Sign in
              </Link>
            </p>
          </div>

          {/* Dashboard shot — the product, not a stock laptop */}
          <div className="relative lg:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
              <Image
                src="/screenshots/dashboard.png"
                alt="The BookQayam dashboard showing bookings, occupancy and revenue"
                width={1920}
                height={1033}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-500">How it works</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Up and running in minutes</h2>
            <p className="mt-3 text-gray-500">
              No training needed. Register, add your rooms and start taking bookings.
            </p>
          </div>
          <StepsCarousel />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-20 border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-500">Features</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Everything your hotel needs</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Built for independent hotels and boutique properties that want to work smarter without
              complex enterprise software.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(feature => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-primary-100 hover:shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                  <feature.icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {BENEFITS.map(benefit => (
              <div key={benefit.title} className="flex gap-3 lg:flex-col lg:gap-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white">
                  <benefit.icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paperwork vs plans ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-500">Pricing</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Replace paper registers</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Every plan includes a <span className="font-semibold text-emerald-600">14-day free trial</span>.
              Pick the size that fits your property — upgrade any time.
            </p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)]">
            {/* What you are replacing */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="font-bold text-gray-900">Current paperwork</h3>
                <ul className="mt-4 space-y-3">
                  {PAPERWORK.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500">
                      <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STATS.map(stat => (
                  <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
                    <p className="text-2xl font-black text-primary-600">{stat.value}</p>
                    <p className="mt-1 text-xs leading-snug text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Plans */}
            {plans.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 py-16">
                <p className="text-sm text-gray-400">Plans coming soon — contact us for pricing.</p>
              </div>
            ) : (
              <div
                className={`grid gap-6 ${
                  plans.length === 1 ? 'max-w-sm' :
                  plans.length === 2 ? 'sm:grid-cols-2' :
                  'sm:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {plans.map((plan, i) => (
                  <PlanCard key={plan.id} plan={plan} highlighted={i === popularIdx && plans.length > 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
            <Gift className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-emerald-700">14-day free trial — start today</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Ready to modernise your hotel?</h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            Try any plan free for 14 days. No credit card required. Full access from day one.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register-hotel" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
              Register your hotel <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login?role=hotel"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
