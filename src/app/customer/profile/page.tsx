'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, Camera, Trash2, User, AlertCircle } from 'lucide-react'
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
  const router       = useRouter()
  const searchParams = useSearchParams()
  // Set when a booking sent the guest here to fill in their details first.
  // Kept to same-site paths so it can't be used to bounce someone off-site.
  const nextParam = searchParams.get('next') ?? ''
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : ''

  const [profile,     setProfile]     = useState<Record<string, unknown> | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [countryCode, setCountryCode] = useState('')   // ISO code for city lookup
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

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
      setAvatarUrl((data?.avatar_url as string | null) ?? null)
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

    // Sent here mid-booking: go straight back and let them finish.
    if (next) {
      toast.info('Back to your booking')
      router.push(next)
    }
  }

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res  = await fetch('/api/profile/avatar', { method: 'POST', body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not upload the photo'); return }
      setAvatarUrl(json.url)
      toast.success('Profile picture updated')
    } catch {
      toast.error('Could not upload the photo')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removeAvatar = async () => {
    setUploading(true)
    try {
      const res  = await fetch('/api/profile/avatar', { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not remove the photo'); return }
      setAvatarUrl(null)
      toast.success('Profile picture removed')
    } catch {
      toast.error('Could not remove the photo')
    } finally {
      setUploading(false)
    }
  }

  // Never a blank circle: the name may be empty, the email never is.
  const initial =
    (String(profile?.full_name ?? '').trim()[0] ??
     String(profile?.email ?? '').trim()[0] ?? '')?.toUpperCase()

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>

  return (
    <div className="max-w-lg space-y-6">
      {next && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">One step before your booking</p>
            <p className="mt-0.5 text-xs text-amber-700">
              The hotel needs your name and phone number to confirm the stay. Save your
              details and we&apos;ll take you straight back to finish it.
            </p>
          </div>
        </div>
      )}

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
          {/* Profile picture — click to replace */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              title="Change profile picture"
              aria-label="Change profile picture"
              className="group relative block h-14 w-14 overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30 transition hover:ring-white/60 disabled:opacity-60"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile picture" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                  {initial || <User className="h-6 w-6" />}
                </span>
              )}
              <span className={`absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity ${
                uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {uploading
                  ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                  : <Camera className="h-5 w-5 text-white" />}
              </span>
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadAvatar(file)
              }}
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white leading-tight truncate">
              {String(profile?.full_name ?? '').trim() || 'My Profile'}
            </h2>
            <p className="text-indigo-300 text-sm mt-0.5 truncate">{String(profile?.email ?? '')}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">Customer</span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-indigo-200 hover:text-white transition-colors disabled:opacity-50"
              >
                {avatarUrl ? 'Change photo' : 'Add photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-200 hover:text-red-200 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-indigo-300/80">JPG, PNG, WEBP or GIF · up to 2 MB</p>
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