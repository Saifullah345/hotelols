import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'

export const metadata = noIndexMetadata

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'customer') redirect('/login')

  return (
    <AdminShell role="customer" title="My Account" profile={profile}>
      {children}
    </AdminShell>
  )
}
