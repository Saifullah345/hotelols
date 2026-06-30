'use client'

import Link from 'next/link'
import { Building2, Lock } from 'lucide-react'

const columns = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/careers', label: 'Careers' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/security', label: 'Security' },
    ],
  },
]

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-gray-900">HotelOS</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              Modern hospitality operations platform. Run bookings, rooms, teams, and payments from one elegant control center.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              All systems operational
            </div>
          </div>

          {columns.map(column => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-500 transition hover:text-gray-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} HotelOS. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3 w-3" />
            SSL Secured
          </div>
        </div>
      </div>
    </footer>
  )
}
