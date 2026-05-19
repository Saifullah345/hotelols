import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings, Shield, Database, Bell } from 'lucide-react'

export const metadata = { title: 'Platform Settings' }

export default async function SuperAdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const [
    { count: totalHotels },
    { count: totalUsers },
    { count: totalPlans },
  ] = await Promise.all([
    supabase.from('hotels').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('plans').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
        <p className="text-gray-500 text-sm mt-1">System overview and configuration</p>
      </div>

      {/* Platform Stats */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Platform Overview</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Hotels', value: totalHotels ?? 0 },
            { label: 'Total Users', value: totalUsers ?? 0 },
            { label: 'Active Plans', value: totalPlans ?? 0 },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Super Admin Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Admin Account</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{profile?.full_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Role</span>
            <span className="badge-blue">super_admin</span>
          </div>
        </div>
      </div>

      {/* Notifications Info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">System Info</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Platform</span>
            <span className="text-sm font-medium text-gray-900">HotelOS SaaS</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Database</span>
            <span className="badge-green">Connected</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Auth Provider</span>
            <span className="text-sm font-medium text-gray-900">Supabase Auth</span>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Advanced configuration</p>
            <p className="text-sm text-amber-700 mt-1">
              To configure email providers, storage limits, or advanced auth settings, use the Supabase dashboard directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
