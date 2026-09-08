import Link from 'next/link'
import Logo from '@/components/layout/Logo'
import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react'

type FooterLink = { label: string; href: string }

const DESTINATIONS: FooterLink[] = [
  { label: 'Naran',       href: '/search?city=Naran' },
  { label: 'Kaghan',      href: '/search?city=Kaghan' },
  { label: 'Shogran',     href: '/search?city=Shogran' },
  { label: 'Balakot',     href: '/search?city=Balakot' },
  { label: 'Babusar Top', href: '/search?city=Babusar Top' },
]

const STAYS: FooterLink[] = [
  { label: 'Hotels',      href: '/search' },
  { label: 'Resorts',     href: '/search' },
  { label: 'Cottages',    href: '/search' },
  { label: 'Guesthouses', href: '/search' },
  { label: 'Cabins',      href: '/search' },
]

const HOSTING: FooterLink[] = [
  { label: 'List Your Property', href: '/register-hotel' },
  { label: 'Host account',       href: '/hotel-admin/dashboard' },
  { label: 'Wishlist',           href: '/customer/bookings' },
  { label: 'Subscription',       href: '/hotel-management#pricing' },
  { label: 'Booking checkout',   href: '/customer/bookings' },
]

const COMPANY: FooterLink[] = [
  { label: 'About us',      href: '/about' },
  { label: 'Contact us',    href: '/contact' },
  { label: 'Travel guide',  href: '/search' },
  { label: 'Sign in',       href: '/login' },
  { label: 'Create account',href: '/register' },
]

const SOCIAL = [
  { label: 'Facebook',  Icon: Facebook,  href: 'https://facebook.com' },
  { label: 'Twitter',   Icon: Twitter,   href: 'https://twitter.com' },
  { label: 'Youtube',   Icon: Youtube,   href: 'https://youtube.com' },
  { label: 'Instagram', Icon: Instagram, href: 'https://instagram.com' },
]

function LinkColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-800 mb-4">{heading}</h3>
      <ul className="space-y-3">
        {links.map(link => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">

          {/* Brand + social */}
          <div>
            <Logo size="sm" />
            <ul className="mt-6 space-y-3">
              {SOCIAL.map(({ label, Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <LinkColumn heading="Destinations" links={DESTINATIONS} />
          <LinkColumn heading="Stays"        links={STAYS} />
          <LinkColumn heading="Hosting"      links={HOSTING} />
          <LinkColumn heading="BookQayam"    links={COMPANY} />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} BookQayam · N6 Solution SMC PVT LTD, Pakistan</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-gray-600 transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
