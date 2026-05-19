'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export default function HotelSettingsPage() {
  const [hotel, setHotel] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) return
      const { data } = await supabase.from('hotels').select('*').eq('id', profile.tenant_id).single()
      setHotel(data)
      reset(data)
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    const { error } = await supabase.from('hotels').update({
      name: data.name,
      description: data.description,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      check_in_time: data.check_in_time,
      check_out_time: data.check_out_time,
    }).eq('id', profile?.tenant_id)
    if (error) { toast.error(error.message); return }
    toast.success('Settings saved')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hotel Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Update your hotel information</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Hotel Name</label>
            <input {...register('name')} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea {...register('description')} className="input resize-none h-24" />
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input {...register('address')} className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input {...register('city')} className="input" />
          </div>
          <div>
            <label className="label">Country</label>
            <input {...register('country')} className="input" />
          </div>
          <div>
            <label className="label">Check-in Time</label>
            <input {...register('check_in_time')} type="time" className="input" />
          </div>
          <div>
            <label className="label">Check-out Time</label>
            <input {...register('check_out_time')} type="time" className="input" />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
