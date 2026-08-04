import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'
import { getPlanFeatures } from '@/lib/plan-features'
import { getCachedHotel } from '@/lib/cache'

export const metadata = noIndexMetadata

export default async function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const store = await cookies()
  const activeRole     = store.get('bq_role')?.value
  const activeTenantId = store.get('bq_tenant')?.value

  if (activeRole !== 'hotel_admin' || !activeTenantId) redirect('/select-role')

  // Verify the active role actually exists for this user — prevents cookie forgery
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'hotel_admin')
    .eq('tenant_id', activeTenantId)
    .maybeSingle()

  if (!roleRow) redirect('/select-role')

  const [{ data: profile }, hotel] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getCachedHotel(activeTenantId),
  ])

  const planFeatures = getPlanFeatures(hotel?.plan ?? null)

  return (
    <AdminShell
      role="hotel-admin"
      hotelName={hotel?.name}
      planFeatures={planFeatures}
      title={hotel?.name ?? 'Hotel Management'}
      profile={profile}
    >
      {children}
    </AdminShell>
  )
}
