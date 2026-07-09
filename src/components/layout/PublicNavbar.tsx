'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Menu, X } from 'lucide-react'

const links = [
  { href: '/#features',     label: 'Features'     },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing',      label: 'Pricing'      },
  { href: '/#reviews',      label: 'Reviews'      },
]

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur">
      {/* 3-column grid: logo | links (centred) | buttons */}
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-3 items-center px-4 sm:px-6 lg:px-8">

        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">HotelOS</span>
        </Link>

        {/* Nav links — truly centred */}
        <nav className="hidden items-center justify-center gap-7 md:flex">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons — right */}
        <div className="hidden items-center justify-end gap-2 md:flex">
          <Link
            href="/login"
            className="text-sm font-semibold px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-200"
          >
            Get started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex justify-end md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm font-semibold px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-center"
                onClick={() => setOpen(false)}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
