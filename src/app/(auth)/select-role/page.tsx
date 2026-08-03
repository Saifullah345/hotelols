'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Hotel, User, ShieldCheck, ClipboardList, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

type UserRole = {
  id: string
  role: string
  tenant_id: string | null
  hotels: { name: string }[] | null
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Platform Admin',
  hotel_admin: 'Hotel Manager',
  staff:       'Hotel Staff',
  customer:    'Guest',
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  hotel_admin: Hotel,
  staff:       ClipboardList,
  customer:    User,
}

const ROLE_DESC: Record<string, string> = {
  super_admin: 'Full platform administration access',
  hotel_admin: 'Manage your hotel, bookings, and staff',
  staff:       'Handle check-ins, bookings, and rooms',
  customer:    'Browse hotels and manage your bookings',
}

const ROLE_REDIRECTS: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff:       '/staff/dashboard',
  customer:    '/',
}

export default function SelectRolePage() {
  const router = useRouter()
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  const activate = useCallback(async (r: UserRole) => {
    setActivating(r.id)
    const res = await fetch('/api/auth/activate-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: r.role, tenantId: r.tenant_id }),
    })
    if (!res.ok) {
      toast.error('Could not activate this role')
      setActivating(null)
      return
    }
    router.push(ROLE_REDIRECTS[r.role] ?? '/')
    router.refresh()
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('user_roles')
      .select('id, role, tenant_id, hotels(name)')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          router.push('/login')
          return
        }
        if (data.length === 1) {
          activate(data[0] as unknown as UserRole)
          return
        }
        setRoles(data as unknown as UserRole[])
        setLoading(false)
      })
  }, [router, activate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Choose your account</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Your email is linked to multiple accounts. Select one to continue.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map(r => {
          const Icon = ROLE_ICONS[r.role] ?? User
          const busy = activating === r.id
          return (
            <button
              key={r.id}
              onClick={() => activate(r)}
              disabled={!!activating}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 text-left transition-all group disabled:opacity-60"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                {busy
                  ? <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
                  : <Icon className="h-5 w-5 text-primary-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{ROLE_LABELS[r.role] ?? r.role}</p>
                {r.hotels?.[0]?.name
                  ? <p className="text-xs text-gray-500 truncate">{r.hotels[0].name}</p>
                  : <p className="text-xs text-gray-500">{ROLE_DESC[r.role]}</p>
                }
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 flex-shrink-0 transition-colors" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
