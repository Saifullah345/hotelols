'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Loader2, Eye, EyeOff, MailCheck,
  User, Building2, ArrowRight, ArrowLeft, CheckCircle2,
  Globe, ShoppingCart, LayoutDashboard, AlertCircle,
} from 'lucide-react'
import { nameSchema } from '@/lib/validation'
import PhoneInput from '@/components/ui/PhoneInput'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'

const schema = z.object({
  full_name:        nameSchema,
  email:            z.string().email('Invalid email address'),
  password:         z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  hotel_name: z.string()
    .min(2, 'Hotel name must be at least 2 characters')
    .max(60, 'Hotel name cannot exceed 60 characters')
    .regex(/^[a-zA-ZÀ-ɏ0-9 &'\-\.]+$/, 'Hotel name contains invalid special characters')
    .refine(v => /[a-zA-ZÀ-ɏ]/.test(v), 'Hotel name must contain at least one letter'),
  city:             z.string().min(2, 'City is required'),
  country:          z.string().min(2, 'Country is required'),
  address:          z.string().min(3, 'Address is required'),
  hotel_phone:      z.string().min(7, 'Hotel phone is required'),
  hotel_email:      z.string().email('Enter a valid hotel email address').min(1, 'Hotel email is required'),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

type Plan = {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  max_rooms: number
  max_staff: number
  feature_listing: boolean | null
  feature_online_booking: boolean | null
  trial_days: number | null
}

const STEP_1_FIELDS: (keyof FormData)[] = ['full_name', 'email', 'password', 'confirm_password']
const STEP_2_FIELDS: (keyof FormData)[] = ['hotel_name', 'city', 'country', 'address', 'hotel_phone', 'hotel_email']

export default function RegisterHotelPage() {
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [showPass, setShowPass]   = useState(false)
  const [done, setDone]           = useState(false)
  const [emailSent, setEmailSent] = useState(true)
  const [countryCode, setCountryCode] = useState('PK')
  const [plans, setPlans]         = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Pakistan' },
  })
  const fullNameField = register('full_name')

  // Fetch plans when reaching step 3
  useEffect(() => {
    if (step !== 3 || plans.length > 0) return
    setPlansLoading(true)
    fetch('/api/plans/public')
      .then(r => r.json())
      .then((data: Plan[]) => {
        setPlans(data)
        if (data.length > 0) setSelectedPlanId(data[0].id)
      })
      .catch(() => toast.error('Could not load plans. Please try again.'))
      .finally(() => setPlansLoading(false))
  }, [step, plans.length])

  const goToStep2 = async () => {
    const ok = await trigger(STEP_1_FIELDS)
    if (ok) setStep(2)
  }

  const goToStep3 = async () => {
    const ok = await trigger(STEP_2_FIELDS)
    if (ok) setStep(3)
  }

  const onSubmit = async (data: FormData) => {
    setInlineError(null)
    if (!selectedPlanId) {
      toast.error('Please select a plan to continue')
      return
    }
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
          plan_id:     selectedPlanId,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setInlineError(json.error)
          setStep(1)
        } else {
          toast.error(json.error ?? 'Registration failed')
        }
        return
      }

      setEmailSent(json.emailSent !== false)
      setDone(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${emailSent ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <MailCheck className={`h-7 w-7 ${emailSent ? 'text-emerald-600' : 'text-amber-600'}`} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {emailSent ? 'Check your email' : 'Account created!'}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
          {emailSent
            ? 'We sent a confirmation link to your inbox. Once you verify your email, your account will be reviewed by our team.'
            : 'Your hotel account was created. The verification email could not be sent — please contact your platform administrator.'}
        </p>
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-left text-indigo-700">
          <p className="font-semibold mb-1">What happens next?</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Verify your email address</li>
            <li>Sign in and start your plan — free trial first, if the plan has one</li>
            <li>Your dashboard unlocks straight away</li>
            <li>Our team approves your hotel for the public site</li>
          </ol>
        </div>
        <Link href="/login?role=hotel" className="mt-6 inline-block text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  const STEPS = [
    { n: 1 as const, label: 'Your Account', icon: User },
    { n: 2 as const, label: 'Hotel Details', icon: Building2 },
    { n: 3 as const, label: 'Choose Plan',   icon: CheckCircle2 },
  ]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register your hotel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get the full hotel management platform for your property.
        </p>
      </div>

      {/* Inline conflict error */}
      {inlineError && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Account already exists</p>
            <p className="mt-0.5 text-amber-700">{inlineError}</p>
            <Link href="/login?role=hotel" className="mt-1.5 inline-block font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
              Sign in →
            </Link>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center mb-7">
        {STEPS.map(({ n, label }, i) => (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                step === n ? 'bg-indigo-600 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${step === n ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-3 min-w-[16px]" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Step 1: Account ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <label className="label">Full Name</label>
              <input
                {...fullNameField}
                onChange={e => {
                  e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
                  fullNameField.onChange(e)
                }}
                className="input"
                placeholder="Ahmed Khan"
              />
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

            <button type="button" onClick={goToStep2} className="btn-primary w-full flex items-center justify-center gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Step 2: Hotel Details ─────────────────────────────── */}
        {step === 2 && (
          <>
            <div>
              <label className="label">Hotel Name <span className="text-red-500">*</span></label>
              <input {...register('hotel_name')} className="input" placeholder="Grand Palace Hotel" autoFocus />
              {errors.hotel_name && <p className="text-red-500 text-xs mt-1">{errors.hotel_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
              </div>
              <div>
                <label className="label">City <span className="text-red-500">*</span></label>
                <CitySelect
                  countryCode={countryCode}
                  value={watch('city') ?? ''}
                  onChange={name => setValue('city', name, { shouldValidate: true })}
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Address <span className="text-red-500">*</span></label>
              <input {...register('address')} className="input" placeholder="Street address, area, building" />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <label className="label">Hotel Phone <span className="text-red-500">*</span></label>
              <PhoneInput
                value={watch('hotel_phone') ?? ''}
                onChange={v => setValue('hotel_phone', v, { shouldValidate: true })}
              />
              {errors.hotel_phone && <p className="text-red-500 text-xs mt-1">{errors.hotel_phone.message}</p>}
            </div>

            <div>
              <label className="label">Hotel Email <span className="text-red-500">*</span></label>
              <input {...register('hotel_email')} type="email" className="input" placeholder="info@hotel.com" />
              {errors.hotel_email && <p className="text-red-500 text-xs mt-1">{errors.hotel_email.message}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="button" onClick={goToStep3} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Choose Plan ───────────────────────────────── */}
        {step === 3 && (
          <>
            <p className="text-sm text-gray-500 -mt-1 mb-4">
              Pick the plan that fits your property. Nothing is charged today — you start your
              subscription the first time you sign in.
            </p>

            {plansLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No plans available. Please contact support.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, idx) => {
                  const isSelected  = plan.id === selectedPlanId
                  const hasListing  = plan.feature_listing !== false
                  const hasBooking  = plan.feature_online_booking !== false
                  const hasTrial    = Number(plan.trial_days ?? 0) > 0
                  const isPopular   = idx === 1   // second plan gets the badge

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative w-full text-left rounded-2xl border-2 p-4 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-indigo-200 bg-white'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide uppercase">
                          Popular
                        </span>
                      )}

                      {/* ── Row 1: radio + name + price ── */}
                      <div className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>

                        <p className="flex-1 font-bold text-base text-gray-900 capitalize">{plan.name}</p>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xl font-bold text-gray-900">
                            {plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}`}
                          </span>
                          {plan.price_monthly > 0 && (
                            <span className="text-xs text-gray-400 ml-1">/mo</span>
                          )}
                        </div>
                      </div>

                      {/* ── Row 2: badges ── */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-8">
                        {hasListing ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <Globe className="h-3 w-3" /> Listed on website
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                            <LayoutDashboard className="h-3 w-3" /> Management only
                          </span>
                        )}
                        {hasListing && hasBooking && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            <ShoppingCart className="h-3 w-3" /> Online booking
                          </span>
                        )}
                        {hasTrial && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            {plan.trial_days}-day free trial
                          </span>
                        )}
                      </div>

                      {/* ── Row 3: features ── */}
                      {Array.isArray(plan.features) && plan.features.length > 0 && (
                        <ul className="mt-2.5 ml-8 space-y-1">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                              {f}
                            </li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-xs text-gray-400 pl-5">
                              +{plan.features.length - 4} more features
                            </li>
                          )}
                        </ul>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPlanId}
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
        <Link href="/login?role=hotel" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Sign in</Link>
      </p>
      <p className="text-center text-sm text-gray-500 mt-2">
        Just a customer?{' '}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Create a guest account</Link>
      </p>
    </>
  )
}
