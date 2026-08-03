'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, BarChart3,
  CreditCard, Star, LogOut, Settings, Hotel, ClipboardList, UserCheck, Search,
  MessageCircle, X, DoorOpen, Sparkles, Heart,
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
  { label: 'Guests',       href: '/hotel-admin/guests',   icon: Users },
  { label: 'Check-In / Out',  href: '/hotel-admin/checkin',       icon: DoorOpen },
  { label: 'Housekeeping',    href: '/hotel-admin/housekeeping',  icon: Sparkles },
  { label: 'WhatsApp',        href: '/hotel-admin/whatsapp',      icon: MessageCircle },
  { label: 'Staff',    href: '/hotel-admin/staff',    icon: UserCheck },
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
  { label: 'Find Hotels',  href: '/',                 icon: Search },
  { label: 'My Bookings',  href: '/customer/bookings', icon: CalendarCheck },
  { label: 'Saved Hotels', href: '/customer/saved',    icon: Heart },
  { label: 'Profile',      href: '/customer/profile',  icon: Users },
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
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        'w-64 flex-col flex-shrink-0 print:hidden',
        'bg-gradient-to-b from-indigo-950 to-indigo-900',
        'md:flex md:relative md:h-screen md:top-0 md:z-auto',
        isOpen ? 'flex fixed inset-y-0 left-0 z-50 h-screen' : 'hidden',
      )}>

        {/* Logo */}
        <div className="h-16 px-4 flex items-center border-b border-white/10 gap-2">
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-white/10 text-indigo-300 mr-1"
          >
            <X className="h-4 w-4" />
          </button>
          <LogoMark svgSize={32} />
          <div className="min-w-0">
            <p className="font-black text-white text-sm truncate">
              Book<span className="text-amber-400">Qayam</span>
            </p>
            {(hotelName || titleMap[role]) && (
              <p className="text-xs text-indigo-300 truncate">{hotelName || titleMap[role]}</p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-indigo-300 hover:text-white hover:bg-white/8 font-medium'
                )}
              >
                {/* Active left indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
                )}
                <Icon className={cn(
                  'h-[17px] w-[17px] flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-indigo-400 group-hover:text-white'
                )} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all text-indigo-300 hover:text-red-300 hover:bg-red-500/15"
          >
            <LogOut className="h-[17px] w-[17px] flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
