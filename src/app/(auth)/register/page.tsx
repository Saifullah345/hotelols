'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, MailCheck, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { nameSchema } from '@/lib/validation'

const schema = z.object({
  full_name: nameSchema,
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function PasswordStrength({ value }: { value: string }) {
  const checks = [
    { label: '8+ characters', ok: value.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(value) },
    { label: 'Number', ok: /\d/.test(value) },
  ]
  if (!value) return null
  return (
    <div className="flex items-center gap-3 mt-2">
      {checks.map(c => (
        <span key={c.label} className={`flex items-center gap-1 text-xs transition-colors ${c.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Check className={`h-3 w-3 ${c.ok ? 'text-emerald-500' : 'text-gray-300'}`} />
          {c.label}
        </span>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setInlineError(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: data.full_name, email: data.email, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setInlineError(json.error)
        } else {
          toast.error(json.error ?? 'Failed to create account')
        }
        return
      }
      setConfirmed(true)
    } catch {
      toast.error('An error occurred. Please try again.')
    }
  }

  if (confirmed) return (
    <div className="text-center">
      <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <MailCheck className="h-7 w-7 text-indigo-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        We sent a confirmation link to your inbox.<br />Click it to activate your account.
      </p>
      <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-4 text-sm text-left">
        <p className="font-semibold text-indigo-800 mb-2">What happens next?</p>
        <ol className="list-decimal list-inside space-y-1 text-indigo-600 text-xs">
          <li>Verify your email address</li>
          <li>Sign in and complete your hotel setup</li>
          <li>Add rooms, staff, and start accepting bookings</li>
        </ol>
      </div>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
        Back to sign in
      </Link>
    </div>
  )

  const pwdRegister = register('password')
  const fullNameField = register('full_name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1.5 text-sm text-gray-500">Free to start — no credit card required.</p>
      </div>

      {inlineError && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Account already exists</p>
            <p className="mt-0.5 text-amber-700">{inlineError}</p>
            <Link href="/login" className="mt-1.5 inline-block font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
              Sign in →
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" error={errors.full_name?.message}>
          <input
            {...fullNameField}
            onChange={e => {
              e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
              fullNameField.onChange(e)
            }}
            className={inputCls}
            placeholder="Ahmad Khan"
            autoFocus
          />
        </Field>

        <Field label="Email address" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputCls} placeholder="you@example.com" />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...pwdRegister}
              onChange={e => { pwdRegister.onChange(e); setPasswordValue(e.target.value) }}
              type={showPassword ? 'text' : 'password'}
              className={`${inputCls} pr-11`}
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength value={passwordValue} />
        </Field>

        <Field label="Confirm password" error={errors.confirm_password?.message}>
          <input {...register('confirm_password')} type="password" className={inputCls} placeholder="••••••••" />
        </Field>

        <button type="submit" disabled={isSubmitting} className="w-full btn-gradient flex items-center justify-center gap-2 mt-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Sign in</Link>
      </p>
      <p className="text-center text-sm text-gray-500 mt-2">
        Hotel owner?{' '}
        <Link href="/register-hotel" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Register your hotel</Link>
      </p>
    </div>
  )
}
