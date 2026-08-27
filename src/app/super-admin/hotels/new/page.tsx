'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Eye, EyeOff,
  Building2, MapPin, Clock, User,
} from 'lucide-react'
import Link from 'next/link'
import { CURRENCIES } from '@/lib/currency'
import { nameSchema, validateHotelName, phoneSchema } from '@/lib/validation'
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
  owner_email:    z.string().email('Valid owner email required'),
  owner_name:     nameSchema,
  owner_password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-primary-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-red-500 text-xs mt-1">{message}</p>
}

export default function NewHotelPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<{ id: string; name: string; price_monthly: number }[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [countryCode, setCountryCode] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { check_in_time: '14:00', check_out_time: '11:00', currency: 'PKR' },
  })

  useEffect(() => {
    createClient().from('plans').select('id, name, price_monthly').then(({ data }) => {
      if (data) setPlans(data)
    })
  }, [])

  const ownerNameField = register('owner_name')

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()

    let ownerId: string | null = null
    const { data: existingOwner } = await supabase
      .from('profiles').select('id').eq('email', data.owner_email).single()

    if (existingOwner) {
      ownerId = existingOwner.id
    } else {
      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.owner_name,
          email: data.owner_email,
          password: data.owner_password,
          role: 'hotel_admin',
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to create owner account'); return }
      if (json.emailWarning) toast.warning(json.emailWarning)
      ownerId = json.userId
    }

    if (!ownerId) { toast.error('Could not resolve owner'); return }

    const hotelId = crypto.randomUUID()
    const { error } = await supabase.from('hotels').insert({
      id: hotelId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      check_in_time: data.check_in_time,
      check_out_time: data.check_out_time,
      currency: data.currency,
      plan_id: data.plan_id,
      owner_id: ownerId,
      status: 'pending',
      images: [],
      amenities: [],
      slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    })

    if (error) { toast.error(error.message); return }

    const { error: roomTypesError } = await supabase.from('room_types').insert([
      { hotel_id: hotelId, name: 'Standard Room',      description: 'Comfortable standard room',                      max_adults: 2, max_children: 0, amenities: ['WiFi', 'TV', 'AC', 'Safe'] },
      { hotel_id: hotelId, name: 'Deluxe Room',        description: 'Spacious deluxe room with city view',            max_adults: 2, max_children: 0, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony'] },
      { hotel_id: hotelId, name: 'Suite',              description: 'Luxurious suite with separate living area',       max_adults: 2, max_children: 2, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony', 'Jacuzzi', 'Kitchen'] },
      { hotel_id: hotelId, name: 'Presidential Suite', description: 'Ultimate luxury experience',                      max_adults: 4, max_children: 2, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony', 'Jacuzzi', 'Kitchen', 'Butler service'] },
    ])
    if (roomTypesError) toast.error('Hotel created, but default room types failed: ' + roomTypesError.message)

    await supabase.from('profiles').update({ role: 'hotel_admin', tenant_id: hotelId }).eq('id', ownerId)

    toast.success('Hotel created. It stays hidden until you activate it.')
    router.push('/super-admin/hotels')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/hotels" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create New Hotel</h2>
          <p className="text-gray-500 text-sm mt-0.5">Set up a new hotel on the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Hotel Information ─────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Building2} title="Hotel Information" />
          <div>
            <label className="label">Hotel Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className="input" placeholder="Grand Palace Hotel" autoFocus />
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

        {/* ── Location ──────────────────────────────────────────── */}
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

        {/* ── Settings ──────────────────────────────────────────── */}
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

        {/* ── Hotel Owner ───────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader
            icon={User}
            title="Hotel Owner"
            subtitle="Enter the owner's email. If they don't have an account yet, fill in their name and a temporary password."
          />
          <div>
            <label className="label">Owner Email <span className="text-red-500">*</span></label>
            <input {...register('owner_email')} type="email" className="input" placeholder="owner@example.com" />
            <FieldError message={errors.owner_email?.message} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Owner Name <span className="text-red-500">*</span></label>
              <input
                {...ownerNameField}
                onChange={e => {
                  e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
                  ownerNameField.onChange(e)
                }}
                className="input"
                placeholder="John Doe"
              />
              <FieldError message={errors.owner_name?.message} />
            </div>
            <div>
              <label className="label">Temporary Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  {...register('owner_password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.owner_password?.message} />
              <p className="text-xs text-gray-400 mt-1">Only used if the owner doesn&apos;t have an account yet.</p>
            </div>
          </div>
        </div>

        {/* Pending notice */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <Building2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p>
            New hotels are created as <span className="font-semibold">pending</span> and stay hidden from the public site until you activate them from the Hotels list.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/super-admin/hotels" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Hotel
          </button>
        </div>
      </form>
    </div>
  )
}
