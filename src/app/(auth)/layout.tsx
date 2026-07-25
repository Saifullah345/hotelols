import { Sparkles } from 'lucide-react'
import Logo from '@/components/layout/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.15),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#eef7ff_50%,_#f8fbff_100%)]">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-6xl flex-col items-center justify-center gap-10 lg:flex-row lg:items-center lg:justify-center">
          <div className="max-w-xl flex-1 rounded-[2rem] border border-indigo-100 bg-white/80 p-8 shadow-xl shadow-indigo-100/60 backdrop-blur sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
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
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                <path d="M 9 15 C 9 6 31 6 31 15 C 31 20 9 20 9 25 C 9 34 31 34 31 25" stroke="#818CF8" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                <line x1="27" y1="32" x2="36" y2="39" stroke="#818CF8" strokeWidth="4.5" strokeLinecap="round"/>
              </svg>
              Trusted by growing hospitality teams worldwide.
            </div>
          </div>

          <div className="w-full max-w-md flex-shrink-0">
            <div className="mb-6 text-center lg:text-left">
              <Logo size="lg" />
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
