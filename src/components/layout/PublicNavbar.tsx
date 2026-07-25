'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Building2, Menu, X } from 'lucide-react'

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Building2 className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Hotelos</span>
        </Link>

        {/* Center links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">Hotels</Link>
          <Link href="/hotel-management" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">For Owners</Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">About</Link>
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/register" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">
            Register
          </Link>
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            Sign in
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Hotels</Link>
          <Link href="/hotel-management" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">For Owners</Link>
          <Link href="/about" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">About</Link>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/register" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Register</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg">Sign in</Link>
          </div>
        </div>
      )}
    </header>
  )
}
