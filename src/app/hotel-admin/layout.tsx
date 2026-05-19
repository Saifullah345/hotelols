import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

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
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="hotel-admin" hotelName={hotel?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={hotel?.name ?? 'Hotel Management'} profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
