'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, MailCheck, Eye, EyeOff,
  User, Mail, Shield, Building2, MapPin, Lock,
} from 'lucide-react'
import Link from 'next/link'
import { nameSchema } from '@/lib/validation'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'

const STAFF_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
]

const schema = z.object({
  full_name:  nameSchema,
  email:      z.string().email('Valid email required'),
  password:   z.string().optional(),
  role:       z.enum(['hotel_admin', 'staff', 'customer']),
  hotel_id:   z.string().optional(),
  department: z.string().optional(),
  position:   z.string().optional(),
  country:    z.string().optional(),
  city:       z.string().optional(),
  address:    z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.role !== 'customer' && !d.password) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' })
  }
  if (d.role === 'customer') {
    if (!d.country || d.country.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'Country is required' })
    }
    if (!d.city || d.city.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['city'], message: 'City is required' })
    }
    if (!d.address || d.address.trim().length < 3) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Address is required' })
    }
  }
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

export default function AddUserPage() {
  const router = useRouter()
  const [hotels,      setHotels]      = useState<{ id: string; name: string }[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [invited,     setInvited]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [countryCode, setCountryCode] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'customer' },
  })
  const fullNameField = register('full_name')
  const role = watch('role')

  useEffect(() => {
    createClient().from('hotels').select('id, name').order('name').then(({ data }) => {
      if (data) setHotels(data)
    })
  }, [])

  const togglePermission = (perm: string) =>
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, permissions }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Failed to create user'); return }

    if (data.role === 'customer') {
      setInvited(true)
    } else {
      toast.success('User created successfully')
      router.push('/super-admin/users')
      router.refresh()
    }
  }

  if (invited) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation sent!</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
          An invitation email has been sent. The user must verify their email before they can log in.
        </p>
        <Link href="/super-admin/users" className="mt-6 inline-block btn-primary text-sm">
          Back to Users
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/users" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
          <p className="text-gray-500 text-sm mt-0.5">Create a new user account on the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Identity ─────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={User} title="Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input
                {...fullNameField}
                onChange={e => {
                  e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
                  fullNameField.onChange(e)
                }}
                className="input"
                placeholder="John Doe"
              />
              <FieldError message={errors.full_name?.message} />
            </div>
            <div>
              <label className="label">Email Address <span className="text-red-500">*</span></label>
              <input {...register('email')} type="email" className="input" placeholder="user@example.com" />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
        </div>

        {/* ── Role & Access ─────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Shield} title="Role & Access" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Role <span className="text-red-500">*</span></label>
              <select {...register('role')} className="input">
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="hotel_admin">Hotel Admin</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Super admin is managed directly in Supabase.
              </p>
            </div>

            {role !== 'customer' && (
              <div>
                <label className="label">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
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
                <FieldError message={errors.password?.message} />
              </div>
            )}
          </div>

          {(role === 'hotel_admin' || role === 'staff') && (
            <div>
              <label className="label">Assign to Hotel</label>
              <select {...register('hotel_id')} className="input">
                <option value="">Select hotel</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}

          {role === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Department</label>
                <input {...register('department')} className="input" placeholder="Front Desk" />
              </div>
              <div>
                <label className="label">Position</label>
                <input {...register('position')} className="input" placeholder="Receptionist" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Permissions</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {STAFF_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Location (customer only) ───────────────────────────── */}
        {role === 'customer' && (
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
              <textarea
                {...register('address')}
                rows={2}
                className="input resize-none"
                placeholder="Street address, apartment, building, etc."
              />
              <FieldError message={errors.address?.message} />
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <Mail className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-700">
                An invitation email will be sent. The customer must verify their email before they can log in.
              </p>
            </div>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Link href="/super-admin/users" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {role === 'customer' ? 'Send Invite' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}
