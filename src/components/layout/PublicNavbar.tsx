'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, CalendarDays, User, LogOut, ChevronDown, Building2, Home } from 'lucide-react'
import Logo from '@/components/layout/Logo'
import { createClient, getBrowserUser } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'

type UserInfo = { name: string; email: string; avatarUrl: string | null }

const NAV_LINKS = [
  { label: 'Stays', href: '/' },
  { label: 'For Hotel Owners', href: '/hotel-management' },
  { label: 'Contact', href: '/contact' },
]

/** '/' only matches itself; every other link also owns its sub-pages, so
 *  /hotels/abc keeps Stays lit and /contact/thanks would keep Contact lit. */
function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

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
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    getBrowserUser(supabase).then(async (u) => {
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
    /* The bar floats as a card rather than spanning the viewport. The strip
       around that card still has to hide the page scrolling underneath it, so
       it is painted solid down past the card and only then fades out — a hard
       edge would read as a second bar. backdrop-blur softens whatever reaches
       the fade at the bottom. */
    <header className="sticky top-0 z-50 bg-gradient-to-b from-white from-75% to-transparent px-3 pb-2 pt-3 backdrop-blur-md sm:px-6 sm:pt-4">
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/70 bg-white/95 shadow-lg shadow-indigo-950/[0.06] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo */}
          <Logo size="md" />

          {/* Center links — desktop */}
          <nav className="hidden items-center gap-2 md:flex lg:gap-6">
            {NAV_LINKS.map(link => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-4 py-2 text-sm rounded-lg transition-colors ${
                    active
                      ? 'font-semibold text-indigo-600 bg-indigo-50'
                      : 'font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {/* Underline marker sits below the pill, not inside it, so the
                      pill's padding stays the same on every item. */}
                  {active && (
                    <span
                      className="absolute -bottom-1 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-indigo-600"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              )
            })}
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
                <Link href="/register-hotel" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-colors">
                  <Home className="h-4 w-4" aria-hidden="true" />
                  List your property
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">
                  Register
                </Link>
                <Link href="/login" className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors">
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
          <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-3 py-2.5 text-sm rounded-lg ${
                    active
                      ? 'font-semibold text-indigo-600 bg-indigo-50'
                      : 'font-medium text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

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
                  <Link href="/register-hotel" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl">
                    <Home className="h-4 w-4" aria-hidden="true" /> List your property
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl">Register</Link>
                  <Link href="/login" onClick={() => setOpen(false)} className="text-center py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl">Sign in</Link>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
