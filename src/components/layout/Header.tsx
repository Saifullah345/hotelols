'use client'

import { Bell, User } from 'lucide-react'
import { useState } from 'react'
import { Profile } from '@/types'

interface HeaderProps {
  title: string
  profile?: Profile | null
}

export function Header({ title, profile }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        <div className="relative">
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
        </div>
      </div>
    </header>
  )
}
