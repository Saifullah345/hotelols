'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, ChartColumn,
  CreditCard, Star, LogOut, Settings, Hotel, ClipboardList, UserCheck, Search,
  X, SprayCan, Heart, Building2, TrendingUp, Receipt,
  ArrowRightLeft, BriefcaseBusiness,
} from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'
import { type PlanFeatures } from '@/lib/plan-features'

/** WhatsApp's own mark — lucide ships no brand icons. Same props shape as a
 * lucide icon so it slots into NavItem.icon unchanged. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  feature?: keyof PlanFeatures
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Hotels',    href: '/super-admin/hotels',    icon: Hotel           },
  { label: 'Billing',   href: '/super-admin/billing',   icon: TrendingUp      },
  { label: 'Plans',     href: '/super-admin/plans',     icon: CreditCard      },
  { label: 'Users',     href: '/super-admin/users',     icon: Users           },
  { label: 'Settings',  href: '/super-admin/settings',  icon: Settings        },
]

const hotelAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/hotel-admin/dashboard', icon: LayoutDashboard },
  { label: 'Rooms', href: '/hotel-admin/rooms', icon: BedDouble },
  { label: 'Bookings', href: '/hotel-admin/bookings', icon: CalendarCheck },
  { label: 'Guests',       href: '/hotel-admin/guests',   icon: Users },
  { label: 'Check-In / Out',  href: '/hotel-admin/checkin',       icon: ArrowRightLeft },
  { label: 'Housekeeping',    href: '/hotel-admin/housekeeping',  icon: SprayCan, feature: 'housekeeping' },
  { label: 'WhatsApp',        href: '/hotel-admin/whatsapp',      icon: WhatsAppIcon },
  { label: 'Staff',    href: '/hotel-admin/staff',    icon: BriefcaseBusiness },
  { label: 'Reports', href: '/hotel-admin/reports', icon: ChartColumn },
  { label: 'Reviews', href: '/hotel-admin/reviews', icon: Star, feature: 'reviews' },
  { label: 'Payments', href: '/hotel-admin/payments', icon: CreditCard },
  { label: 'Billing', href: '/hotel-admin/billing', icon: Receipt },
  { label: 'Settings', href: '/hotel-admin/settings', icon: Settings },
]

const staffNav: NavItem[] = [
  { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'Check-In', href: '/staff/checkin', icon: UserCheck },
  { label: 'Bookings', href: '/staff/bookings', icon: ClipboardList },
  { label: 'Rooms', href: '/staff/rooms', icon: BedDouble },
]

const customerNav: NavItem[] = [
  { label: 'Find Hotels',       href: '/',                          icon: Search },
  { label: 'My Bookings',       href: '/customer/bookings',         icon: CalendarCheck },
  { label: 'Saved Hotels',      href: '/customer/saved',            icon: Heart },
  { label: 'List Your Property',href: '/customer/register-hotel',   icon: Building2 },
  { label: 'Profile',           href: '/customer/profile',          icon: Users },
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
