'use client'

import Link from 'next/link'
import Logo from '@/components/layout/Logo'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Logo size="sm" />
            <p className="mt-3 text-sm text-gray-500">
              Find and book the perfect hotel for every occasion.
            </p>
          </div>

          {/* Guest links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">For Guests</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/" className="hover:text-gray-900 transition-colors">Find Hotels</Link></li>
              <li><Link href="/register" className="hover:text-gray-900 transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link></li>
              <li><Link href="/customer/bookings" className="hover:text-gray-900 transition-colors">My Bookings</Link></li>
            </ul>
          </div>

          {/* Hotel owners */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">For Hotel Owners</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/hotel-management" className="hover:text-gray-900 transition-colors">Hotel Management</Link></li>
              <li><Link href="/register-hotel" className="hover:text-gray-900 transition-colors">Register Your Hotel</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Manage Your Hotel</Link></li>
              <li><Link href="/about" className="hover:text-gray-900 transition-colors">About StayQayam</Link></li>
              <li><Link href="/contact" className="hover:text-gray-900 transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} StayQayam. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
