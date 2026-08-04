import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'
import { getPlanFeatures, type PlanDbData } from '@/lib/plan-features'

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

  const [{ data: profile }, { data: hotel }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('hotels').select(
      'name, plan:plans(name, feature_housekeeping, feature_reviews, feature_online_booking, feature_advanced_reports, feature_api_access, feature_multi_property)'
    ).eq('id', activeTenantId).single(),
  ])

  const hotelData = hotel as { name?: string; plan?: PlanDbData } | null
  const planFeatures = getPlanFeatures(hotelData?.plan)

  return (
    <AdminShell
      role="hotel-admin"
      hotelName={hotelData?.name}
      planFeatures={planFeatures}
      title={hotelData?.name ?? 'Hotel Management'}
      profile={profile}
    >
      {children}
    </AdminShell>
  )
}
