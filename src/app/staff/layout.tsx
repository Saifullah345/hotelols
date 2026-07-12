import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'staff') redirect('/login')

  const { data: hotel } = await supabase.from('hotels').select('name').eq('id', profile.tenant_id).single()

  return (
    <AdminShell role="staff" hotelName={hotel?.name} title="Front Desk" profile={profile}>
      {children}
    </AdminShell>
  )
}
