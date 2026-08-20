'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, CalendarDays, User, LogOut, ChevronDown, Building2 } from 'lucide-react'
import Logo from '@/components/layout/Logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type UserInfo = { name: string; email: string; avatarUrl: string | null }

/** Initials for the fallback avatar. Never returns an empty string — an unnamed
 *  profile would otherwise render a blank coloured circle. */
function initialsOf(name: string, email: string) {
  const fromName = name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  if (fromName) return fromName.toUpperCase()
  return (email.trim()[0] ?? '').toUpperCase()
}

/** Profile picture when the account has one, initials otherwise. */
function Avatar({ user, size }: { user: UserInfo; size: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs'
  const initials = initialsOf(user.name, user.email)

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name}
        referrerPolicy="no-referrer"
        className={`${box} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    )
  }

  return (
    <div className={`${box} rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initials || <User className="h-3.5 w-3.5" />}
    </div>
  )
}

export default function PublicNavbar() {
  const [open, setOpen]         = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser]         = useState<UserInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const router  = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', u.id)
          .single()
        // Only show customer menu on public pages — admins are redirected away anyway
        if (profile?.role === 'customer') {
          const meta = (u.user_metadata ?? {}) as { full_name?: string; avatar_url?: string; picture?: string }
          const email = u.email ?? ''
          setUser({
            // A profile row created by the signup trigger starts with an empty
            // name, so fall back through the auth metadata to the email handle.
            name: profile.full_name?.trim() || meta.full_name?.trim() || email.split('@')[0] || 'Guest',
            email,
            // Social logins carry their picture in the auth metadata.
            avatarUrl: profile.avatar_url || meta.avatar_url || meta.picture || null,
          })
        }
      }
      setLoading(false)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Logo size="md" />

        {/* Center links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">Stays</Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">About</Link>
          <Link href="/contact" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">Contact</Link>
        </nav>

        {/* Right actions — desktop */}
        <div className="hidden md:flex items-center gap-2">
          {!loading && user ? (
            /* ── Logged-in user menu ── */
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors"
              >
                <Avatar user={user} size="sm" />
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/customer/bookings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      My Bookings
                    </Link>
                    <Link
                      href="/customer/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      href="/customer/register-hotel"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Building2 className="h-4 w-4 text-gray-400" />
                      List Your Property
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : !loading ? (
            /* ── Guest links ── */
            <>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">
                Register
              </Link>
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors">
                Register your property
              </Link>
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                Sign in
              </Link>
            </>
          ) : null}
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
          <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Stays</Link>
          <Link href="/about" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">About</Link>
          <Link href="/contact" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Contact</Link>

          <div className="pt-2 border-t border-gray-100">
            {!loading && user ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar user={user} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Link href="/customer/bookings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  <CalendarDays className="h-4 w-4 text-gray-400" /> My Bookings
                </Link>
                <Link href="/customer/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  <User className="h-4 w-4 text-gray-400" /> My Profile
                </Link>
                <Link href="/customer/register-hotel" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  <Building2 className="h-4 w-4 text-gray-400" /> List Your Property
                </Link>
                <button
                  type="button"
                  onClick={() => { setOpen(false); handleSignOut() }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : !loading ? (
              <div className="flex flex-col gap-2">
                <Link href="/register" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Register</Link>
                <Link href="/login" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-lg">Register your property</Link>
                <Link href="/login" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg">Sign in</Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  )
}
