import { Building2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.24),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef7ff_50%,_#f8fbff_100%)]">
      <PublicNavbar />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-10 lg:flex-row lg:items-center lg:justify-center">
          <div className="max-w-xl flex-1 rounded-[2rem] border border-primary-100 bg-white/80 p-8 shadow-xl shadow-primary-100/60 backdrop-blur sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
              <Sparkles className="h-4 w-4" />
              Modern hospitality operations
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Welcome to the next generation of hotel management.
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Sign in or create an account to manage bookings, rooms, team access, and guest experiences from a single control center.
            </p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-gray-200 bg-slate-950 px-4 py-4 text-sm text-slate-200">
              <Building2 className="h-5 w-5 text-primary-400" />
              Trusted by growing hospitality teams worldwide.
            </div>
          </div>

          <div className="w-full max-w-md flex-shrink-0">
            <div className="mb-6 text-center lg:text-left">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-2xl font-semibold tracking-tight text-gray-900">HotelOS</span>
              </Link>
            </div>
            <div className="rounded-[1.75rem] border border-gray-200/80 bg-white p-8 shadow-2xl shadow-gray-200/70">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
