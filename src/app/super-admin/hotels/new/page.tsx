'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Hotel name required'),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  city: z.string().min(2),
  country: z.string().min(2),
  check_in_time: z.string(),
  check_out_time: z.string(),
  plan_id: z.string().uuid('Select a plan'),
  owner_email: z.string().email('Valid owner email required'),
  owner_name: z.string().min(2, 'Owner name is required'),
  owner_password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

export default function NewHotelPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<{ id: string; name: string; price_monthly: number }[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { check_in_time: '14:00', check_out_time: '11:00' },
  })

  useEffect(() => {
    createClient().from('plans').select('id, name, price_monthly').then(({ data }) => {
      if (data) setPlans(data)
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()

    // Try to find existing owner by email
    let ownerId: string | null = null
    const { data: existingOwner } = await supabase
      .from('profiles').select('id').eq('email', data.owner_email).single()

    if (existingOwner) {
      ownerId = existingOwner.id
    } else {
      // Owner not found — create a new account for them
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
      plan_id: data.plan_id,
      owner_id: ownerId,
      // New hotels start hidden from the public site. The super admin reviews and
      // clicks "Activate" (Hotels list → row menu) to publish them for booking.
      status: 'pending',
      images: [],
      amenities: [],
      slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    })

    if (error) { toast.error(error.message); return }

    // Seed default room types so the Add Room dropdown is never empty
    const { error: roomTypesError } = await supabase.from('room_types').insert([
      { hotel_id: hotelId, name: 'Standard Room', description: 'Comfortable standard room', capacity: 2, amenities: ['WiFi', 'TV', 'AC', 'Safe'] },
      { hotel_id: hotelId, name: 'Deluxe Room', description: 'Spacious deluxe room with city view', capacity: 2, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony'] },
      { hotel_id: hotelId, name: 'Suite', description: 'Luxurious suite with separate living area', capacity: 4, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony', 'Jacuzzi', 'Kitchen'] },
      { hotel_id: hotelId, name: 'Presidential Suite', description: 'Ultimate luxury experience', capacity: 6, amenities: ['WiFi', 'TV', 'AC', 'Safe', 'Minibar', 'Balcony', 'Jacuzzi', 'Kitchen', 'Butler service'] },
    ])
    if (roomTypesError) toast.error('Hotel created, but default room types failed: ' + roomTypesError.message)

    // Assign owner role + tenant to the hotel
    await supabase.from('profiles').update({ role: 'hotel_admin', tenant_id: hotelId }).eq('id', ownerId)

    toast.success('Hotel created. It stays hidden until you activate it.')
    router.push('/super-admin/hotels')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/hotels" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create New Hotel</h2>
          <p className="text-gray-500 text-sm">Set up a new hotel on the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Hotel Name</label>
            <input {...register('name')} className="input" placeholder="Grand Palace Hotel" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Hotel Email</label>
            <input {...register('email')} type="email" className="input" placeholder="info@hotel.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input" placeholder="+1 234 567 890" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input {...register('address')} className="input" placeholder="123 Main Street" />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <label className="label">City</label>
            <input {...register('city')} className="input" placeholder="New York" />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <label className="label">Country</label>
            <input {...register('country')} className="input" placeholder="United States" />
            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
          </div>

          <div>
            <label className="label">Check-in Time</label>
            <input {...register('check_in_time')} type="time" className="input" />
          </div>

          <div>
            <label className="label">Check-out Time</label>
            <input {...register('check_out_time')} type="time" className="input" />
          </div>

          <div>
            <label className="label">Subscription Plan</label>
            <select {...register('plan_id')} className="input">
              <option value="">Select plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price_monthly}/mo</option>
              ))}
            </select>
            {errors.plan_id && <p className="text-red-500 text-xs mt-1">{errors.plan_id.message}</p>}
          </div>
        </div>

        {/* Owner section */}
        <div className="border-t border-gray-200 pt-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Hotel Owner</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Enter the owner&apos;s email. If they don&apos;t have an account yet, fill in their name and a temporary password.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Owner Email</label>
              <input {...register('owner_email')} type="email" className="input" placeholder="owner@example.com" />
              {errors.owner_email && <p className="text-red-500 text-xs mt-1">{errors.owner_email.message}</p>}
            </div>

            <div>
              <label className="label">Owner Name</label>
              <input {...register('owner_name')} className="input" placeholder="John Doe" />
              {errors.owner_name && <p className="text-red-500 text-xs mt-1">{errors.owner_name.message}</p>}
            </div>

            <div>
              <label className="label">Temporary Password</label>
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
              {errors.owner_password && <p className="text-red-500 text-xs mt-1">{errors.owner_password.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Used only if the owner doesn&apos;t have an account yet.</p>
            </div>
          </div>
        </div>

        <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          New hotels are created as <span className="font-semibold">pending</span> and stay hidden from the public
          site until you activate them from the Hotels list.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
