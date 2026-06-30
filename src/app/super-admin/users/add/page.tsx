'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, MailCheck, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const STAFF_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
]

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().optional(),
  role: z.enum(['hotel_admin', 'staff', 'customer']),
  hotel_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.role !== 'customer' && !d.password) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' })
  }
})

type FormData = z.infer<typeof schema>

export default function AddUserPage() {
  const router = useRouter()
  const [hotels, setHotels] = useState<{ id: string; name: string }[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [invited, setInvited] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'customer' },
  })

  const role = watch('role')

  useEffect(() => {
    createClient().from('hotels').select('id, name').order('name').then(({ data }) => {
      if (data) setHotels(data)
    })
  }, [])

  const togglePermission = (perm: string) => {
    setPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, permissions }),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Failed to create user')
      return
    }

    if (data.role === 'customer') {
      setInvited(true)
    } else {
      toast.success('User created successfully')
      router.push('/super-admin/users')
    }
  }

  if (invited) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <MailCheck className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invite sent!</h2>
        <p className="text-gray-500 text-sm">
          An invitation email has been sent. The user must verify their email and set a password before they can log in.
        </p>
        <Link href="/super-admin/users" className="mt-6 inline-block btn-primary text-sm">
          Back to Users
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/users" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
          <p className="text-gray-500 text-sm">Create a new user account on the platform</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input {...register('full_name')} className="input" placeholder="John Doe" />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="label">Email Address</label>
            <input {...register('email')} type="email" className="input" placeholder="user@example.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Role</label>
            <select {...register('role')} className="input">
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="hotel_admin">Hotel Admin</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              The platform has a single super admin, managed directly in Supabase.
            </p>
          </div>

          {role !== 'customer' && (
            <div>
              <label className="label">Password</label>
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
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}

          {(role === 'hotel_admin' || role === 'staff') && (
            <div className={role === 'hotel_admin' ? 'md:col-span-2' : ''}>
              <label className="label">Assign to Hotel</label>
              <select {...register('hotel_id')} className="input">
                <option value="">Select hotel</option>
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'staff' && (
            <>
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
            </>
          )}
        </div>

        {role === 'customer' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <input {...register('country')} className="input" placeholder="United States" />
              </div>
              <div>
                <label className="label">City</label>
                <input {...register('city')} className="input" placeholder="New York" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <textarea {...register('address')} rows={2} className="input resize-none" placeholder="Street address, apartment, etc." />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              An invitation email will be sent. The customer must verify their email before they can log in.
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
