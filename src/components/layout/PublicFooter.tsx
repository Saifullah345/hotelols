'use client'

import Link from 'next/link'
import Logo from '@/components/layout/Logo'
import { MapPin } from 'lucide-react'
import { activeSocialLinks } from '@/lib/social'

type FooterLink = { label: string; href: string }

const GUEST_LINKS: FooterLink[] = [
  { label: 'Find Hotels', href: '/' },
  { label: 'Create Account', href: '/register' },
  { label: 'Sign In', href: '/login' },
  { label: 'My Bookings', href: '/customer/bookings' },
]

const COMPANY_LINKS: FooterLink[] = [
  { label: 'About BookQayam', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Security', href: '/security' },
  { label: 'Terms of Service', href: '/terms' },
]

const OWNER_LINKS: FooterLink[] = [
  { label: 'Hotel Management', href: '/hotel-management' },
  { label: 'Register Your Hotel', href: '/register-hotel' },
  { label: 'Manage Your Hotel', href: '/login' },
]


function LinkColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{heading}</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-500">
        {links.map(link => (
          <li key={link.label}>
            <Link href={link.href} className="transition-colors hover:text-gray-900">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PublicFooter() {
  const social = activeSocialLinks()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Logo size="sm" />
            <p className="mt-3 text-sm text-gray-500">
             Discover and book trusted hotels across Pakistan with ease. Find the right stay, compare optionsand book with confidence.
            </p>

            {social.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {social.map(({ label, icon: Icon, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <LinkColumn heading="For Guests" links={GUEST_LINKS} />
          <LinkColumn heading="Company" links={COMPANY_LINKS} />
          <LinkColumn heading="For Hotel Owners" links={OWNER_LINKS} />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BookQayam. All rights reserved.</p>

          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            N6 Solution SMC PVT LTD, Pakistan
          </p>

          <div className="flex gap-4">
            <Link href="/privacy" className="transition-colors hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-gray-600">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
