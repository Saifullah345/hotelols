import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'

export default async function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'hotel_admin') redirect('/login')

  const { data: hotel } = await supabase
    .from('hotels')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  return (
    <AdminShell
      role="hotel-admin"
      hotelName={hotel?.name}
      title={hotel?.name ?? 'Hotel Management'}
      profile={profile}
    >
      {children}
    </AdminShell>
  )
}
