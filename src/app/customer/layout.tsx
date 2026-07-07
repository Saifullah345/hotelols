import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'customer') redirect('/login')

  // The "complete your profile" nudge now lives in the notification bell
  // (see Header → NotificationBell), so no separate toast is needed here.
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="customer" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="My Account" profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
