'use client'

import { Bell, User, LogOut, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'

interface HeaderProps {
  title: string
  profile?: Profile | null
}

export function Header({ title, profile }: HeaderProps) {
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
        </button>

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
