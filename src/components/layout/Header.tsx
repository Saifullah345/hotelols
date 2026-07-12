'use client'

import { User, LogOut, Settings, Menu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  title: string
  profile?: Profile | null
  onMenuOpen?: () => void
}

export function Header({ title, profile, onMenuOpen }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const settingsHrefByRole: Record<string, string> = {
    super_admin: '/super-admin/settings',
    hotel_admin: '/hotel-admin/settings',
  }
  const profileHref = profile?.role ? settingsHrefByRole[profile.role] : undefined

  // The "complete your profile" nudge (shown in the bell) is customer-only —
  // that's the flow where a filled-in name + phone speeds up booking.
  const nudgeHref = profile?.role === 'customer' ? '/customer/profile' : undefined
  const profileIncomplete = !!profile && (!profile.full_name?.trim() || !profile.phone?.trim())

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-base md:text-lg font-semibold text-gray-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell
          userId={profile?.id}
          profileIncomplete={profileIncomplete}
          profileHref={nudgeHref}
        />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name ?? 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
              </div>
              {profileHref && (
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push(profileHref)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Profile
                </button>
              )}
              <button
                onClick={() => {
                  setShowDropdown(false)
                  handleLogout()
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
