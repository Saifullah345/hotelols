'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const STAFF_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
]

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
})
type FormData = z.infer<typeof schema>

export default function InviteStaffPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<string[]>(['rooms:read', 'bookings:read'])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const togglePermission = (perm: string) => {
    setPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, role: 'staff', permissions }),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Failed to add staff member')
      return
    }

    toast.success('Staff member added successfully')
    router.push('/hotel-admin/staff')
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/staff" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Staff Member</h2>
          <p className="text-gray-500 text-sm">Create a new staff account for your hotel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input {...register('full_name')} className="input" placeholder="Jane Smith" />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="label">Email Address</label>
            <input {...register('email')} type="email" className="input" placeholder="staff@hotel.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="label">Temporary Password</label>
            <input {...register('password')} type="password" className="input" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            <p className="text-xs text-gray-400 mt-1">Share this with the staff member. They can change it after login.</p>
          </div>

          <div>
            <label className="label">Department</label>
            <input {...register('department')} className="input" placeholder="Front Desk" />
            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
          </div>

          <div>
            <label className="label">Position</label>
            <input {...register('position')} className="input" placeholder="Receptionist" />
            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="label">Permissions</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/hotel-admin/staff" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Staff Member
          </button>
        </div>
      </form>
    </div>
  )
}
