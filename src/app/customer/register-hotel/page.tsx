'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, Building2, ArrowRight, ArrowLeft, CheckCircle2,
  Globe, ShoppingCart, LayoutDashboard, MailCheck,
} from 'lucide-react'
import PhoneInput from '@/components/ui/PhoneInput'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'

type Plan = {
  id: string
  name: string
  price_monthly: number
  features: string[]
  feature_listing: boolean | null
  feature_online_booking: boolean | null
}

export default function CustomerRegisterHotelPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [done, setDone] = useState(false)

  // Hotel details
  const [hotelName, setHotelName]   = useState('')
  const [city, setCity]             = useState('')
  const [country, setCountry]       = useState('Pakistan')
  const [countryCode, setCountryCode] = useState('PK')
  const [address, setAddress]       = useState('')
  const [hotelPhone, setHotelPhone] = useState('')
  const [hotelEmail, setHotelEmail] = useState('')
  const [errors, setErrors]         = useState<Record<string, string>>({})

  // Plan selection
  const [plans, setPlans]             = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    if (step !== 2 || plans.length > 0) return
    setPlansLoading(true)
    fetch('/api/plans/public')
      .then(r => r.json())
      .then((data: Plan[]) => {
        setPlans(data)
        if (data.length > 0) setSelectedPlanId(data[0].id)
      })
      .catch(() => toast.error('Could not load plans'))
      .finally(() => setPlansLoading(false))
  }, [step, plans.length])

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    const name = hotelName.trim()
    if (!name)                                               e.hotelName = 'Hotel name is required'
    else if (name.length < 2)                                e.hotelName = 'Hotel name must be at least 2 characters'
    else if (name.length > 60)                               e.hotelName = 'Hotel name cannot exceed 60 characters'
    else if (!/[a-zA-ZÀ-ɏ]/.test(name))                    e.hotelName = 'Hotel name must contain at least one letter'
    else if (/[^a-zA-ZÀ-ɏ0-9 &'\-\.]/.test(name))         e.hotelName = 'Hotel name contains invalid special characters'
    if (!city.trim())                                        e.city      = 'City is required'
    if (!hotelPhone)                                         e.hotelPhone = 'Hotel phone is required'
    const emailVal = hotelEmail.trim()
    if (!emailVal)                                           e.hotelEmail = 'Hotel email is required'
    else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(emailVal))
                                                             e.hotelEmail = 'Enter a valid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goToStep2 = () => {
    if (validateStep1()) setStep(2)
  }

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      toast.error('Please select a plan')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/customer/register-hotel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_name:  hotelName,
          city,
          country,
          address,
          hotel_phone: hotelPhone,
          hotel_email: hotelEmail,
          plan_id:     selectedPlanId,
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
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <MailCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hotel submitted!</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
          Your hotel registration is pending review. Once our team approves it, your selected plan will be activated and you can switch to your hotel dashboard.
        </p>
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-left text-indigo-700">
          <p className="font-semibold mb-1.5">What happens next?</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Our team reviews your hotel details</li>
            <li>You receive an approval notification</li>
            <li>Your selected plan is activated</li>
            <li>Switch roles to access your Hotel Dashboard</li>
          </ol>
        </div>
        <button
          onClick={() => router.push('/customer/bookings')}
          className="mt-6 btn-primary"
        >
          Back to My Account
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">List Your Property</h1>
        <p className="mt-1 text-sm text-gray-500">
          Register your hotel under your existing account. No payment required — your plan activates after approval.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[
          { n: 1 as const, label: 'Hotel Details', icon: Building2 },
          { n: 2 as const, label: 'Choose Plan',   icon: CheckCircle2 },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              step === n ? 'bg-indigo-600 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
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

      <div className="card p-6 space-y-4">

        {/* ── Step 1: Hotel Details ── */}
        {step === 1 && (
          <>
            <div>
              <label className="label">Hotel Name <span className="text-red-500">*</span></label>
              <input
                value={hotelName}
                onChange={e => setHotelName(e.target.value.replace(/[^a-zA-ZÀ-ɏ0-9 &'\-\.]/g, ''))}
                maxLength={60}
                className="input"
                placeholder="Grand Palace Hotel"
              />
              {errors.hotelName && <p className="text-red-500 text-xs mt-1">{errors.hotelName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Country</label>
                <CountrySelect
                  value={countryCode}
                  onChange={(isoCode, name) => {
                    setCountryCode(isoCode)
                    setCountry(name)
                    setCity('')
                  }}
                />
              </div>
              <div>
                <label className="label">City</label>
                <CitySelect
                  countryCode={countryCode}
                  value={city}
                  onChange={setCity}
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>

            <div>
              <label className="label">Address <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="input"
                placeholder="Street address, area"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hotel Phone <span className="text-red-500">*</span></label>
                <PhoneInput value={hotelPhone} onChange={setHotelPhone} />
                {errors.hotelPhone && <p className="text-red-500 text-xs mt-1">{errors.hotelPhone}</p>}
              </div>
              <div>
                <label className="label">Hotel Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={hotelEmail}
                  onChange={e => setHotelEmail(e.target.value.replace(/[^a-zA-Z0-9._%+\-@]/g, ''))}
                  maxLength={100}
                  className="input"
                  placeholder="info@hotel.com"
                />
                {errors.hotelEmail && <p className="text-red-500 text-xs mt-1">{errors.hotelEmail}</p>}
              </div>
            </div>

            <button onClick={goToStep2} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Step 2: Choose Plan ── */}
        {step === 2 && (
          <>
            <p className="text-sm text-gray-500">
              Choose the plan that fits your property. No payment now — plan activates after approval.
            </p>

            {plansLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No plans available. Please contact support.</p>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => {
                  const isSelected  = plan.id === selectedPlanId
                  const hasListing  = plan.feature_listing !== false
                  const hasBooking  = plan.feature_online_booking !== false
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected ? 'border-primary-500 bg-primary-50/60 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{plan.name}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {hasListing ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <Globe className="h-3 w-3" /> Listed on website
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                                  <LayoutDashboard className="h-3 w-3" /> Management only
                                </span>
                              )}
                              {hasListing && hasBooking && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <ShoppingCart className="h-3 w-3" /> Online booking
                                </span>
                              )}
                            </div>
                            {Array.isArray(plan.features) && plan.features.length > 0 && (
                              <ul className="mt-2 space-y-0.5">
                                {plan.features.slice(0, 4).map((f, i) => (
                                  <li key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" /> {f}
                                  </li>
                                ))}
                                {plan.features.length > 4 && (
                                  <li className="text-xs text-gray-400 pl-4">+{plan.features.length - 4} more</li>
                                )}
                              </ul>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-gray-900">
                            {plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}`}
                          </p>
                          {plan.price_monthly > 0 && <p className="text-xs text-gray-400">/month</p>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedPlanId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
