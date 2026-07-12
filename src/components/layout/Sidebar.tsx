'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, LayoutDashboard, BedDouble, CalendarCheck, Users, BarChart3,
  CreditCard, Star, LogOut, Settings, Hotel, ClipboardList, UserCheck, Search,
  MessageCircle,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Hotels', href: '/super-admin/hotels', icon: Hotel },
  { label: 'Plans', href: '/super-admin/plans', icon: CreditCard },
  { label: 'Users', href: '/super-admin/users', icon: Users },
  { label: 'Settings', href: '/super-admin/settings', icon: Settings },
]

const hotelAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/hotel-admin/dashboard', icon: LayoutDashboard },
  { label: 'Rooms', href: '/hotel-admin/rooms', icon: BedDouble },
  { label: 'Bookings', href: '/hotel-admin/bookings', icon: CalendarCheck },
  { label: 'WhatsApp', href: '/hotel-admin/whatsapp', icon: MessageCircle },
  { label: 'Staff', href: '/hotel-admin/staff', icon: Users },
  { label: 'Reports', href: '/hotel-admin/reports', icon: BarChart3 },
  { label: 'Reviews', href: '/hotel-admin/reviews', icon: Star },
  { label: 'Payments', href: '/hotel-admin/payments', icon: CreditCard },
  { label: 'Settings', href: '/hotel-admin/settings', icon: Settings },
]

const staffNav: NavItem[] = [
  { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Check-In', href: '/staff/checkin', icon: UserCheck },
  { label: 'Bookings', href: '/staff/bookings', icon: ClipboardList },
  { label: 'Rooms', href: '/staff/rooms', icon: BedDouble },
]

const customerNav: NavItem[] = [
  { label: 'Search Hotels', href: '/customer/hotels', icon: Search },
  { label: 'My Bookings', href: '/customer/bookings', icon: CalendarCheck },
  { label: 'Profile', href: '/customer/profile', icon: Users },
]

const navMap: Record<string, NavItem[]> = {
  'super-admin': superAdminNav,
  'hotel-admin': hotelAdminNav,
  staff: staffNav,
  customer: customerNav,
}

const titleMap: Record<string, string> = {
  'super-admin': 'Super Admin',
  'hotel-admin': 'Hotel Admin',
  staff: 'Staff Panel',
  customer: 'My Account',
}

interface SidebarProps {
  role: string
  hotelName?: string
}

export function Sidebar({ role, hotelName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = navMap[role] ?? []

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center border-b border-gray-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 bg-primary-600 rounded-xl flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate" title={hotelName || titleMap[role]}>
              HotelOS
              {(hotelName || titleMap[role]) && (
                <span className="font-normal text-gray-400 ml-1">· {hotelName || titleMap[role]}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          if (isActive) {
            return (
              <span key={item.href} className={cn('sidebar-link active')}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-link"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
