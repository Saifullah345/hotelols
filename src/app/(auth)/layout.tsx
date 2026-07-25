import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { LogoMarkOnDark } from '@/components/layout/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30">
      <PublicNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-xl shadow-indigo-100/60 border border-gray-100 flex">

          {/* Left panel */}
          <div className="hidden md:flex md:w-[42%] flex-col justify-between relative overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.3),transparent_60%)]" />

            <Link href="/" className="flex items-center gap-1 relative z-10">
              <LogoMarkOnDark svgSize={28} />
              <span className="text-base font-black tracking-tight text-white">
                Book<span className="text-indigo-300">Qayam</span>
              </span>
            </Link>

            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold text-white leading-snug">
                Book stays.<br />Run hotels.
              </h2>
              <p className="mt-3 text-sm text-indigo-200/75 leading-relaxed">
                One platform for guests and hotel owners — discover, book, and manage everything in one place.
              </p>
            </div>

            <p className="relative z-10 text-xs text-indigo-400">
              © {new Date().getFullYear()} BookQayam
            </p>
          </div>

          {/* Right panel */}
          <div className="flex-1 bg-white px-8 py-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
