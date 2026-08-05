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
import { type PlanFeatures } from '@/lib/plan-features'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  feature?: keyof PlanFeatures
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
  { label: 'Housekeeping',    href: '/hotel-admin/housekeeping',  icon: Sparkles, feature: 'housekeeping' },
  { label: 'WhatsApp',        href: '/hotel-admin/whatsapp',      icon: MessageCircle },
  { label: 'Staff',    href: '/hotel-admin/staff',    icon: UserCheck },
  { label: 'Reports', href: '/hotel-admin/reports', icon: BarChart3 },
  { label: 'Reviews', href: '/hotel-admin/reviews', icon: Star, feature: 'reviews' },
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

const ALL_FEATURES: PlanFeatures = {
  listing: true, housekeeping: true, reviews: true, onlineBooking: true,
  advancedReports: true, apiAccess: false, multiProperty: false,
}

interface SidebarProps {
  role: string
  hotelName?: string
  planFeatures?: PlanFeatures
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, hotelName, planFeatures, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const features = planFeatures ?? ALL_FEATURES
  const navItems = (navMap[role] ?? []).filter(item => !item.feature || features[item.feature])

  const handleLogout = async () => {
    // Clear the active role cookie before signing out
    await fetch('/api/auth/activate-role', { method: 'DELETE' }).catch(() => {})
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
        'bg-white border-r border-gray-200',
        'md:flex md:relative md:h-screen md:top-0 md:z-auto',
        isOpen ? 'flex fixed inset-y-0 left-0 z-50 h-screen' : 'hidden',
      )}>

        {/* Logo */}
        <div className="h-16 px-4 flex items-center border-b border-gray-200 gap-2">
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500 mr-1"
          >
            <X className="h-4 w-4" />
          </button>
          <LogoMark svgSize={32} />
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">
              Book<span className="text-primary-600">Qayam</span>
            </p>
            {(hotelName || titleMap[role]) && (
              <p className="text-xs text-gray-500 truncate">{hotelName || titleMap[role]}</p>
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
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 font-medium'
                )}
              >
                {/* Active left indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-600 rounded-r-full" />
                )}
                <Icon className={cn(
                  'h-[17px] w-[17px] flex-shrink-0 transition-colors',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all text-gray-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-[17px] w-[17px] flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
