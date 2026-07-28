'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import { phoneSchema, nameSchema } from '@/lib/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'
import Link from 'next/link'

const schema = z.object({
  full_name: nameSchema,
  phone: phoneSchema,
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function CustomerProfilePage() {
  const [profile,     setProfile]     = useState<Record<string, unknown> | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [countryCode, setCountryCode] = useState('')   // ISO code for city lookup

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, errors, isSubmitted } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const fullNameField = register('full_name')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      reset(data)
      // Try to restore ISO code from stored country name
      if (data?.country) {
        const { Country } = await import('country-state-city')
        const match = Country.getAllCountries().find(c => c.name === data.country)
        if (match) setCountryCode(match.isoCode)
      }
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
      {/* Gradient header banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <Link href="/customer/bookings" className="p-2 hover:bg-white/10 rounded-xl transition-colors text-indigo-300 hover:text-white shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {String(profile?.full_name ?? '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white leading-tight truncate">{String(profile?.full_name ?? 'My Profile')}</h2>
            <p className="text-indigo-300 text-sm mt-0.5 truncate">{String(profile?.email ?? '')}</p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">Customer</span>
          </div>
        </div>
      </div>

      <div className="card p-6">

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              {...fullNameField}
              onChange={e => {
                e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
                fullNameField.onChange(e)
              }}
              className="input"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label">Phone Number</label>
            <PhoneInput
              value={watch('phone') ?? ''}
              onChange={v => setValue('phone', v, { shouldValidate: isSubmitted })}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Country</label>
              <CountrySelect
                value={countryCode}
                onChange={(isoCode, name) => {
                  setCountryCode(isoCode)
                  setValue('country', name, { shouldValidate: isSubmitted })
                  setValue('city', '', { shouldValidate: false })
                }}
              />
            </div>
            <div>
              <label className="label">City</label>
              <CitySelect
                countryCode={countryCode}
                value={watch('city') ?? ''}
                onChange={name => setValue('city', name, { shouldValidate: isSubmitted })}
              />
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