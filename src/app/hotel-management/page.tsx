import Link from 'next/link'
import Image from 'next/image'
import {
  BedDouble, CreditCard, Users, BarChart3,
  Bell, CheckCircle2, ArrowRight, ShieldCheck,
  CalendarDays, Receipt, ClipboardList,
  Clock, Smartphone, Gift,
  PenLine, ReceiptText, CircleHelp, TrendingUp, FileWarning, FileQuestion,
  Headphones, Sprout, Building2, Rocket, Star, NotebookPen,
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

// What a paper-run property is living with — the strip above the plans.
const PAPERWORK = [
  { icon: PenLine,      label: 'Registers rewritten by hand every day'   },
  { icon: ReceiptText,  label: 'Receipts scribbled on a pad, or skipped' },
  { icon: CircleHelp,   label: 'Availability guessed from memory'        },
  { icon: TrendingUp,   label: 'Revenue added up at month end, if at all'},
  { icon: FileWarning,  label: 'Records lost when a notebook goes missing' },
  { icon: FileQuestion, label: 'No idea which room type actually earns'  },
]

// Reassurance strip under the plans. Takes the trial length so it quotes the
// same number as the headline and the buttons.
function trustItems(trialDays: number) {
  return [
    { icon: ShieldCheck, title: `${trialDays}-day free trial`, desc: 'Try all features, risk-free'  },
    { icon: CreditCard,  title: 'No credit card required',     desc: 'Start instantly, no payments' },
    { icon: Clock,       title: 'Setup in < 2 minutes',        desc: 'Get started in no time'       },
    { icon: Headphones,  title: '24/7 support',                desc: 'We’re here when you need us'  },
  ]
}

/**
 * Card dressing that isn't in the `plans` table: the icon and the one-line
 * "who is this for". Chosen by the plan's position in the price-sorted list —
 * cheapest is the entry tier, dearest is the top one — so adding or renaming a
 * plan in Super Admin needs no change here. Anything in between falls back to
 * the middle treatment.
 */
const PLAN_LOOKS = {
  entry:  { icon: Sprout,     tagline: 'Perfect for small hotels & guest houses' },
  middle: { icon: Building2,  tagline: 'Best for growing hotels'                 },
  top:    { icon: Rocket,     tagline: 'For larger properties & teams'           },
} as const

function planLook(index: number, total: number) {
  if (total > 1 && index === 0)         return PLAN_LOOKS.entry
  if (total > 1 && index === total - 1) return PLAN_LOOKS.top
  return PLAN_LOOKS.middle
}

/** Plan names are free-form text (migration 004) and are stored lower-case in
 * places ("starter", "growth") — title-cased for display without touching the
 * stored value. Written without a regex on purpose: an escape slip here fails
 * silently, leaving the name lower-case with nothing to show for it. */
function planTitle(name: string) {
  return name
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

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

/** Comparable form of a bullet: lower case, punctuation flattened to spaces. */
function normaliseBullet(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * The bullet list for a plan card: the plan's own copy first (it is written for
 * the buyer and carries the "Everything in <lower plan>" line), then any generic
 * capability flag it hasn't already covered.
 *
 * The two lists describe overlapping things in different words — a plan can list
 * "Housekeeping module" in `features` while also having `feature_housekeeping`
 * set, and the Growth plan managed four such pairs at once. A flag is dropped
 * whenever some line of the plan's own copy already contains it, so the card
 * says each thing once, in the hotel's own wording.
 */
function planBullets(extras: string[], included: string[]) {
  const seen = new Set<string>()
  const bullets: string[] = []

  for (const label of extras) {
    const key = normaliseBullet(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    bullets.push(label)
  }

  const written = bullets.map(normaliseBullet)
  for (const label of included) {
    const key = normaliseBullet(label)
    if (!key || seen.has(key) || written.some(line => line.includes(key))) continue
    seen.add(key)
    bullets.push(label)
  }

  return bullets
}

/**
 * One pricing card. `highlighted` is the outlined-indigo "Most popular"
 * treatment — a ring and a badge rather than a filled panel, so all three cards
 * stay equally readable and the emphasis comes from the border and the CTA.
 *
 * Only the features a plan actually includes are listed. The old card also
 * printed the excluded ones in grey with a cross, which made the entry plan read
 * as a list of things you don't get.
 */
function PlanCard({
  plan, highlighted, index, total, trialDays,
}: {
  plan: Plan
  highlighted: boolean
  index: number
  total: number
  trialDays: number
}) {
  const yearlyMonthly = plan.price_yearly / 12
  const yearlySaving = plan.price_monthly > 0
    ? Math.round((1 - yearlyMonthly / plan.price_monthly) * 100)
    : 0
  const look = planLook(index, total)
  const Icon = look.icon
  const included = FEATURE_FLAGS.filter(f => plan[f.key as keyof Plan] as boolean).map(f => f.label)
  const extras = Array.isArray(plan.features) ? plan.features : []
  const bullets = planBullets(extras, included)

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white p-6 transition-shadow ${
        highlighted
          ? 'border-2 border-primary-500 shadow-lg shadow-primary-100 lg:-my-4 lg:pt-10'
          : 'border border-gray-200 hover:shadow-md'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          <Star className="h-3 w-3 fill-white" aria-hidden="true" />
          Most Popular
        </span>
      )}

      {/* Identity */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900">{planTitle(plan.name)}</h3>
          <p className="text-xs text-gray-500">{look.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-end gap-1">
        <span className="text-4xl font-black tracking-tight text-gray-900">
          {formatPrice(plan.price_monthly)}
        </span>
        <span className="mb-1.5 text-sm text-gray-400">/month</span>
      </div>

      {plan.price_yearly > 0 && (
        <p className="mt-1 text-xs text-gray-400">
          {formatPrice(plan.price_yearly)}/year
          {yearlySaving > 0 && (
            <span className="ml-1.5 font-semibold text-emerald-600">save {yearlySaving}%</span>
          )}
        </p>
      )}

      {/* Limits */}
      <div className="mt-5 grid grid-cols-2 divide-x divide-gray-200 overflow-hidden rounded-xl bg-gray-50">
        <div className="px-3 py-3 text-center">
          <p className="text-lg font-black text-primary-600">{formatLimit(plan.max_rooms)}</p>
          <p className="mt-0.5 text-xs text-gray-500">Rooms</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-lg font-black text-primary-600">{formatLimit(plan.max_staff)}</p>
          <p className="mt-0.5 text-xs text-gray-500">Staff accounts</p>
        </div>
      </div>

      {/* What's included */}
      <ul className="mt-5 space-y-2.5">
        {bullets.map(label => (
          <li key={label} className="flex items-start gap-2.5 text-sm text-gray-700">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 fill-primary-600 text-white"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Link
          href="/register-hotel"
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            highlighted
              ? 'bg-primary-600 text-white shadow-sm shadow-primary-200 hover:bg-primary-700'
              : 'border border-primary-200 text-primary-600 hover:bg-primary-50'
          }`}
        >
          {trialDays > 0 ? 'Start Free Trial' : 'Get Started'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-2.5 text-center text-xs text-gray-400">No credit card required</p>
      </div>
    </div>
  )
}

export default async function HotelManagementPage() {
  const plans = await getPlans()
  // The middle plan carries the highlight, as before.
  const popularIdx = plans.length > 1 ? Math.floor(plans.length / 2) : 0
  // One source for every mention of the trial on this page, so the headline, the
  // buttons and the reassurance strip can never quote different numbers.
  // `plans.trial_days` is currently 0 on every row, so this falls back to the
  // 14 days the rest of the site advertises — set trial_days in Super Admin →
  // Plans and the copy follows the data instead.
  const trialDays = Math.max(0, ...plans.map(p => p.trial_days ?? 0)) || 14

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

      {/* ── Pricing ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary-500">Pricing</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Simple pricing for every property
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
              Start free for <span className="font-semibold text-gray-700">{trialDays} days</span>. Choose a
              plan that fits your property and upgrade anytime.
            </p>
          </div>

          {/* What you are replacing — one strip rather than a column beside the
              plans, so the cards get the full width on every breakpoint. */}
          <div className="mb-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
                  <NotebookPen className="h-6 w-6 text-primary-500" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">Still using paper registers?</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                    Switch to BookQayam and save time, avoid mistakes, and keep everything organized.
                  </p>
                </div>
              </div>

              {/* Single rule between the pitch and the six symptoms, matching the
                  divider in the design — the items themselves are not boxed. */}
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:border-l lg:border-gray-200 lg:pl-8">
                {PAPERWORK.map(item => (
                  <li key={item.label} className="text-center">
                    <item.icon className="mx-auto h-7 w-7 text-primary-500" strokeWidth={1.6} aria-hidden="true" />
                    <p className="mx-auto mt-2.5 max-w-[10rem] text-[11.5px] leading-[1.45] text-gray-500">
                      {item.label}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Plans */}
          {plans.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-gray-100 py-16">
              <p className="text-sm text-gray-400">Plans coming soon — contact us for pricing.</p>
            </div>
          ) : (
            <div
              className={`mx-auto grid gap-6 ${
                plans.length === 1 ? 'max-w-sm' :
                plans.length === 2 ? 'max-w-3xl sm:grid-cols-2' :
                'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  highlighted={i === popularIdx && plans.length > 1}
                  index={i}
                  total={plans.length}
                  trialDays={trialDays}
                />
              ))}
            </div>
          )}

          {/* Reassurance */}
          <div className="mt-12 rounded-2xl border border-gray-100 bg-gray-50/70 px-6 py-6">
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trustItems(trialDays).map(item => (
                <li key={item.title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                    <item.icon className="h-5 w-5 text-primary-600" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
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
