'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Profile } from '@/types'

interface AdminShellProps {
  children: React.ReactNode
  role: string
  hotelName?: string
  title: string
  profile?: Profile | null
}

export function AdminShell({ children, role, hotelName, title, profile }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto">
      <Sidebar
        role={role}
        hotelName={hotelName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 print:block print:overflow-visible">
        <Header
          title={title}
          profile={profile}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">{children}</main>
      </div>
    </div>
  )
}
