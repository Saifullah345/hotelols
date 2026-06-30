'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Menu, X } from 'lucide-react'

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">HotelOS</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm font-medium text-gray-600 transition hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get started
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 md:hidden"
          onClick={() => setOpen(value => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map(link => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-600" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="text-sm font-medium text-gray-600" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/register" className="btn-primary w-full justify-center text-sm" onClick={() => setOpen(false)}>
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
