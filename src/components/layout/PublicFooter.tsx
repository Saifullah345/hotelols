import Link from 'next/link'
import Logo from '@/components/layout/Logo'
import NewsletterSignup from '@/components/layout/NewsletterSignup'
import {
  ArrowRight, Building2, CalendarCheck, FileText, Headphones, Info, LogIn,
  MapPin, Phone, Search, Send, Settings, ShieldCheck, User, type LucideIcon,
} from 'lucide-react'
import { activeSocialLinks } from '@/lib/social'

type FooterLink = { label: string; href: string; icon: LucideIcon }

const GUEST_LINKS: FooterLink[] = [
  { label: 'Find Hotels',    href: '/',                  icon: Search },
  { label: 'Create Account', href: '/register',          icon: User },
  { label: 'Sign In',        href: '/login',             icon: LogIn },
  { label: 'My Bookings',    href: '/customer/bookings', icon: CalendarCheck },
]

const COMPANY_LINKS: FooterLink[] = [
  { label: 'About BookQayam',  href: '/about',    icon: Info },
  { label: 'Contact Us',       href: '/contact',  icon: Phone },
  { label: 'Security',         href: '/security', icon: ShieldCheck },
  { label: 'Terms of Service', href: '/terms',    icon: FileText },
]

const OWNER_LINKS: FooterLink[] = [
  { label: 'Hotel Management',    href: '/hotel-management', icon: Building2 },
  { label: 'Register Your Hotel', href: '/register-hotel',   icon: User },
  { label: 'Manage Your Hotel',   href: '/login',            icon: Settings },
]

function LinkColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-base font-bold text-gray-900">{heading}</h3>
      <ul className="mt-4 space-y-3.5">
        {links.map(({ label, href, icon: Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="group inline-flex items-center gap-2.5 text-sm text-gray-500 transition-colors hover:text-indigo-600"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-indigo-500"
                aria-hidden="true"
              />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 bg-gradient-to-b from-white via-indigo-50/30 to-indigo-50/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Newsletter band ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-50 via-indigo-50/70 to-violet-100/60 ring-1 ring-indigo-100">
          {/* Decorative wash on the right. pointer-events-none so it never eats
              a click aimed at the Subscribe button underneath it. */}
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex flex-1 items-center gap-5 sm:gap-7">
              <span
                className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/70 ring-1 ring-indigo-100 sm:flex"
                aria-hidden="true"
              >
                <Send className="h-8 w-8 -rotate-12 text-indigo-500" />
              </span>

              <div className="sm:border-l sm:border-indigo-200/70 sm:pl-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                  Stay updated
                </p>
                <h2 className="mt-1.5 text-xl font-bold text-gray-900 sm:text-2xl">
                  Get the latest updates &amp; offers
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Subscribe to our newsletter and never miss out on new features, tips and special offers.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-[26rem] lg:shrink-0">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        {/* ── Brand, links, support ──────────────────────────────────────── */}
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <Logo size="lg" />
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Discover and book trusted hotels across Pakistan with ease. Find the right stay,
              compare options and book with confidence.
            </p>

            {social.length > 0 && (
              <div className="mt-6 flex items-center gap-2.5">
                {social.map(({ label, icon: Icon, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-indigo-600 hover:text-white"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <LinkColumn heading="For Guests"       links={GUEST_LINKS} />
          <LinkColumn heading="Company"          links={COMPANY_LINKS} />
          <LinkColumn heading="For Hotel Owners" links={OWNER_LINKS} />

          {/* Support card. Spans the full row under the link columns until there
              is a fifth grid track for it to sit in at xl. */}
          <div className="rounded-2xl bg-indigo-50/70 p-6 ring-1 ring-indigo-100 sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <div className="flex items-center gap-3.5">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-indigo-500 ring-1 ring-indigo-100"
                aria-hidden="true"
              >
                <Headphones className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-400">Need Help?</p>
                <p className="text-lg font-bold text-gray-900">24/7 Support</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-500">Our team is always here to help you.</p>

            <Link
              href="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-gray-200/70 pt-6 text-xs text-gray-500 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BookQayam. All rights reserved.</p>

          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />
            N6 Solution SMC PVT LTD, Pakistan
          </p>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-indigo-600">Privacy</Link>
            <span className="h-3 w-px bg-gray-300" aria-hidden="true" />
            <Link href="/terms" className="transition-colors hover:text-indigo-600">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
