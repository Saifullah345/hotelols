'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Building2, MapPin, Clock, CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { CURRENCIES } from '@/lib/currency'
import { validateHotelName, phoneSchema } from '@/lib/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'

const schema = z.object({
  name: z.string().superRefine((v, ctx) => {
    const err = validateHotelName(v)
    if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err })
  }),
  email:          z.string().min(1, 'Hotel email is required').email('Invalid email format'),
  phone:          phoneSchema,
  address:        z.string().min(3, 'Address is required'),
  city:           z.string().min(2, 'City is required'),
  country:        z.string().min(2, 'Country is required'),
  check_in_time:  z.string(),
  check_out_time: z.string(),
  currency:       z.string().min(3, 'Select a currency'),
  plan_id:        z.string().uuid('Select a plan'),
})
type FormData = z.infer<typeof schema>

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary-600" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-red-500 text-xs mt-1">{message}</p>
}

export default function EditHotelPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const hotelId = params.id

  const [plans, setPlans]       = useState<{ id: string; name: string; price_monthly: number }[]>([])
  const [loading, setLoading]   = useState(true)
  const [countryCode, setCountryCode] = useState('')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('hotels').select('*').eq('id', hotelId).single(),
      supabase.from('plans').select('id, name, price_monthly'),
    ]).then(([{ data: hotel }, { data: planList }]) => {
      if (planList) setPlans(planList)
      if (hotel) {
        reset({
          name:           hotel.name ?? '',
          email:          hotel.email ?? '',
          phone:          hotel.phone ?? '',
          address:        hotel.address ?? '',
          city:           hotel.city ?? '',
          country:        hotel.country ?? '',
          check_in_time:  hotel.check_in_time ?? '14:00',
          check_out_time: hotel.check_out_time ?? '11:00',
          currency:       hotel.currency ?? 'PKR',
          plan_id:        hotel.plan_id ?? '',
        })
      }
      setLoading(false)
    })
  }, [hotelId, reset])

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/super-admin/hotels/${hotelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(json.error ?? 'Failed to update hotel'); return }
    toast.success('Hotel updated')
    router.push(`/super-admin/hotels/${hotelId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/super-admin/hotels/${hotelId}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Hotel</h2>
          <p className="text-gray-500 text-sm mt-0.5">Update hotel details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Hotel Info ─────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Building2} title="Hotel Information" />
          <div>
            <label className="label">Hotel Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className="input" placeholder="Grand Palace Hotel" />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Hotel Email <span className="text-red-500">*</span></label>
              <input {...register('email')} type="email" className="input" placeholder="info@hotel.com" />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label className="label">Phone <span className="text-red-500">*</span></label>
              <PhoneInput
                value={watch('phone') ?? ''}
                onChange={v => setValue('phone', v, { shouldValidate: true })}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
        </div>

        {/* ── Location ───────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={MapPin} title="Location" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Country <span className="text-red-500">*</span></label>
              <CountrySelect
                value={countryCode}
                onChange={(isoCode, name) => {
                  setCountryCode(isoCode)
                  setValue('country', name, { shouldValidate: true })
                  setValue('city', '', { shouldValidate: false })
                }}
              />
              <FieldError message={errors.country?.message} />
            </div>
            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <CitySelect
                countryCode={countryCode}
                value={watch('city') ?? ''}
                onChange={name => setValue('city', name, { shouldValidate: true })}
              />
              <FieldError message={errors.city?.message} />
            </div>
          </div>
          <div>
            <label className="label">Address <span className="text-red-500">*</span></label>
            <input {...register('address')} className="input" placeholder="Street address, building, area" />
            <FieldError message={errors.address?.message} />
          </div>
        </div>

        {/* ── Settings ───────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Clock} title="Settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Check-in Time</label>
              <input {...register('check_in_time')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Check-out Time</label>
              <input {...register('check_out_time')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Currency <span className="text-red-500">*</span></label>
              <select {...register('currency')} className="input">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <FieldError message={errors.currency?.message} />
            </div>
            <div>
              <label className="label">Subscription Plan <span className="text-red-500">*</span></label>
              <select {...register('plan_id')} className="input">
                <option value="">Select plan</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price_monthly}/mo</option>
                ))}
              </select>
              <FieldError message={errors.plan_id?.message} />
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Link href={`/super-admin/hotels/${hotelId}`} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
