import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'

export const metadata = noIndexMetadata

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const store = await cookies()
  const activeRole = store.get('bq_role')?.value

  if (activeRole !== 'customer') redirect('/select-role')

  const [roleResult, { data: profile }] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'customer')
      .is('tenant_id', null)
      .maybeSingle(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!roleResult.data) redirect('/select-role')

  return (
    <AdminShell role="customer" title="My Account" profile={profile}>
      {children}
    </AdminShell>
  )
}
