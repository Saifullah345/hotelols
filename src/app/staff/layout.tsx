import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'

export const metadata = noIndexMetadata

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const store = await cookies()
  const activeRole     = store.get('bq_role')?.value
  const activeTenantId = store.get('bq_tenant')?.value

  if (activeRole !== 'staff' || !activeTenantId) redirect('/select-role')

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'staff')
    .eq('tenant_id', activeTenantId)
    .maybeSingle()

  if (!roleRow) redirect('/select-role')

  const [{ data: profile }, { data: hotel }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('hotels').select('name').eq('id', activeTenantId).single(),
  ])

  return (
    <AdminShell role="staff" hotelName={hotel?.name} title="Front Desk" profile={profile}>
      {children}
    </AdminShell>
  )
}
