'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, User } from 'lucide-react'
import { phoneSchema } from '@/lib/validation'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: phoneSchema,
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      reset(data)
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: data.full_name,
      phone: data.phone,
      country: data.country,
      city: data.city,
      address: data.address,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); return }
    toast.success('Profile updated')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your account details</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {String(profile?.full_name ?? '?')[0]?.toUpperCase() ?? <User className="h-8 w-8" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{String(profile?.full_name ?? '')}</p>
            <p className="text-sm text-gray-500">{String(profile?.email ?? '')}</p>
            <span className="badge-blue mt-1">Customer</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input {...register('full_name')} className="input" />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input {...register('phone')} className="input" placeholder="+1 234 567 890" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Country</label>
              <input {...register('country')} className="input" placeholder="United States" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" placeholder="New York" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea {...register('address')} rows={2} className="input resize-none" placeholder="Street address, apartment, etc." />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={String(profile?.email ?? '')} className="input bg-gray-50" disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}