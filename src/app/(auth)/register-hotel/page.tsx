'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2, Eye, EyeOff, MailCheck,
  User, Building2, ArrowRight, ArrowLeft,
} from 'lucide-react'

const schema = z.object({
  full_name:       z.string().min(2,  'Full name is required'),
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(8,  'Password must be at least 8 characters'),
  confirm_password: z.string(),
  hotel_name:      z.string().min(2,  'Hotel name is required'),
  city:            z.string().min(2,  'City is required'),
  country:         z.string().min(2,  'Country is required'),
  address:         z.string().optional(),
  hotel_phone:     z.string().optional(),
  hotel_email:     z.string().email('Invalid hotel email').optional().or(z.literal('')),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

const STEP_1_FIELDS: (keyof FormData)[] = ['full_name', 'email', 'password', 'confirm_password']

export default function RegisterHotelPage() {
  const [step, setStep]           = useState<1 | 2>(1)
  const [showPass, setShowPass]   = useState(false)
  const [done, setDone]           = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Pakistan' },
  })

  const goToStep2 = async () => {
    const ok = await trigger(STEP_1_FIELDS)
    if (ok) setStep(2)
  }

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/auth/signup-hotel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:   data.full_name,
          email:       data.email,
          password:    data.password,
          hotel_name:  data.hotel_name,
          city:        data.city,
          country:     data.country,
          address:     data.address  ?? '',
          hotel_phone: data.hotel_phone ?? '',
          hotel_email: data.hotel_email ?? '',
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Registration failed')
        return
      }

      setDone(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MailCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
          We sent a confirmation link to your inbox. Click it to activate your account and access your hotel dashboard.
        </p>
        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 text-left">
          <p className="font-semibold mb-1">What happens next?</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-600">
            <li>Verify your email address</li>
            <li>Sign in and complete your hotel setup</li>
            <li>Add rooms, staff, and start accepting bookings</li>
          </ol>
        </div>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary-600 hover:text-primary-700 font-medium">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register your hotel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get the full HotelOS management platform for your property — free for 14 days.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-7">
        {[
          { n: 1, label: 'Your Account', icon: User },
          { n: 2, label: 'Hotel Details', icon: Building2 },
        ].map(({ n, label, icon: Icon }, i) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              step === n
                ? 'bg-blue-600 text-white'
                : step > n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {step > n ? '✓' : n}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${step === n ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Step 1: Account ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <label className="label">Full Name</label>
              <input {...register('full_name')} className="input" placeholder="Ahmed Khan" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input {...register('confirm_password')} type="password" className="input" placeholder="••••••••" />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="button"
              onClick={goToStep2}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Step 2: Hotel Details ─────────────────────────────── */}
        {step === 2 && (
          <>
            <div>
              <label className="label">Hotel Name</label>
              <input {...register('hotel_name')} className="input" placeholder="Grand Palace Hotel" />
              {errors.hotel_name && <p className="text-red-500 text-xs mt-1">{errors.hotel_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input {...register('city')} className="input" placeholder="Islamabad" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label className="label">Country</label>
                <input {...register('country')} className="input" placeholder="Pakistan" />
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Address <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('address')} className="input" placeholder="Street address, area" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hotel Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('hotel_phone')} className="input" placeholder="+92 300 0000000" />
              </div>
              <div>
                <label className="label">Hotel Email <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('hotel_email')} type="email" className="input" placeholder="info@hotel.com" />
                {errors.hotel_email && <p className="text-red-500 text-xs mt-1">{errors.hotel_email.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Registering...' : 'Register Hotel'}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
      </p>
      <p className="text-center text-sm text-gray-500 mt-2">
        Just a customer?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">Create a guest account</Link>
      </p>
    </>
  )
}
