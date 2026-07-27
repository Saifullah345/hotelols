'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, BarChart3,
  CreditCard, Star, LogOut, Settings, Hotel, ClipboardList, UserCheck, Search,
  MessageCircle, X,
} from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'

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
  { label: 'Find Hotels', href: '/', icon: Search },
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
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, hotelName, isOpen = false, onClose }: SidebarProps) {
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
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        'w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 print:hidden',
        // Desktop: always visible as a sticky sidebar
        'md:flex md:relative md:h-screen md:top-0 md:z-auto',
        // Mobile: fixed drawer when open, hidden otherwise
        isOpen ? 'flex fixed inset-y-0 left-0 z-50 h-screen' : 'hidden',
      )}>
      {/* Logo */}
      <div className="h-16 px-4 flex items-center border-b border-gray-200">
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden mr-2 p-1 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1 min-w-0">
          <LogoMark svgSize={32} />
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">
              Book<span className="text-indigo-600">Qayam</span>
              {(hotelName || titleMap[role]) && (
                <span className="font-normal text-gray-400 ml-1">· {hotelName || titleMap[role]}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 pb-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
              onClick={onClose}
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
    </>
  )
}
