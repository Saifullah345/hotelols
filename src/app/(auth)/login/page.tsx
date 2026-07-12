'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, MailCheck, ShieldCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const roleRedirects: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff: '/staff/dashboard',
  customer: '/customer/hotels',
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  // Stays true from a successful sign-in through the navigation that follows.
  const [redirecting, setRedirecting] = useState(false)

  // OTP step state
  const [creds, setCreds] = useState<FormData | null>(null)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [otpResending, setOtpResending] = useState(false)

  // Forgot-password step state
  const [forgotStep, setForgotStep] = useState<'none' | 'request' | 'confirm'>('none')
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Establishes the real session client-side and routes by role.
  const completeLogin = async (data: FormData) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) { toast.error(error.message); return false }

    const { data: { user } } = await supabase.auth.getUser()
    let profile: { role?: string } | null = null
    if (user) {
      try {
        const result = await supabase.from('profiles').select('role').eq('id', user.id).single()
        profile = result.data ?? null
      } catch {
        profile = null
      }
    }

    toast.success('Logged in successfully')
    setRedirecting(true)
    router.push(profile?.role ? roleRedirects[profile.role] ?? '/' : '/')
    router.refresh()
    return true
  }

  const onSubmit = async (data: FormData) => {
    // Step 1: verify credentials server-side. Customers get an emailed OTP;
    // everyone else signs in straight away.
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      toast.error(json.error ?? 'Unable to sign in')
      return
    }
    if (json.needsEmailVerification) {
      setUnverifiedEmail(data.email)
      return
    }
    if (json.otpRequired) {
      setCreds(data)
      setOtp('')
      toast.success('We emailed you a 6-digit verification code')
      return
    }
    await completeLogin(data)
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creds || otp.length < 6) return
    setVerifying(true)
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, code: otp }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error ?? 'Invalid code')
      setOtp('')
      setVerifying(false)
      return
    }
    const ok = await completeLogin(creds)
    if (!ok) setVerifying(false)
  }

  const resendOtp = async () => {
    if (!creds) return
    setOtpResending(true)
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })
    setOtpResending(false)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(json.error ?? 'Could not resend code'); return }
    toast.success('A new code is on its way')
  }

  const resendVerification = async () => {
    if (!unverifiedEmail) return
    setResending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email: unverifiedEmail })
    setResending(false)
    if (error) toast.error(error.message)
    else toast.success('Verification email resent')
  }

  const sendResetCode = async (email: string) => {
    setSendingReset(true)
    try {
      const res = await fetch('/api/auth/password-reset/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? 'Could not send reset code')
        return
      }
      setForgotEmail(email)
      setForgotStep('confirm')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('If an account exists for that email, a reset code is on its way')
    } finally {
      setSendingReset(false)
    }
  }

  const onForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (forgotEmail) sendResetCode(forgotEmail)
  }

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetCode.length < 6) { toast.error('Enter the 6-digit code'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setResettingPassword(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? 'Could not reset password')
        return
      }
      toast.success('Password reset! Please sign in with your new password.')
      setForgotStep('none')
      setForgotEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setResettingPassword(false)
    }
  }

  // --- Email-not-verified screen ---
  if (unverifiedEmail) {
    return (
      <div className="text-center py-4">
        <MailCheck className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h2>
        <p className="text-gray-500 text-sm mb-1">
          Your email address hasn&apos;t been verified yet.
        </p>
        <p className="text-gray-500 text-sm">
          Check your inbox for the verification link we sent to <strong>{unverifiedEmail}</strong>.
        </p>
        <button
          onClick={resendVerification}
          disabled={resending}
          className="mt-5 btn-primary flex items-center justify-center gap-2 mx-auto text-sm"
        >
          {resending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resend verification email
        </button>
        <button
          onClick={() => setUnverifiedEmail(null)}
          className="mt-3 block mx-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // --- Forgot-password: request code ---
  if (forgotStep === 'request') {
    return (
      <div className="py-2">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Reset your password</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your account email and we&apos;ll send you a 6-digit code to reset your password.
        </p>
        <form onSubmit={onForgotSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={sendingReset || !forgotEmail}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {sendingReset && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset code
          </button>
        </form>
        <button
          onClick={() => setForgotStep('none')}
          className="mt-4 block mx-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // --- Forgot-password: enter code + new password ---
  if (forgotStep === 'confirm') {
    return (
      <div className="py-2">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Enter your reset code</h2>
        <p className="text-gray-500 text-sm mb-6">
          We sent a 6-digit code to <strong>{forgotEmail}</strong>. Enter it below along with your new password.
        </p>
        <form onSubmit={onResetSubmit} className="space-y-4">
          <div>
            <label className="label">Reset code</label>
            <input
              value={resetCode}
              onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="------"
              className="input text-center text-2xl tracking-[0.5em] font-semibold"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={resettingPassword}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {resettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </button>
        </form>
        <div className="mt-4 flex items-center justify-center gap-1 text-sm text-gray-500">
          Didn&apos;t get it?
          <button onClick={() => sendResetCode(forgotEmail)} disabled={sendingReset} className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
            {sendingReset && <Loader2 className="h-3 w-3 animate-spin" />}
            Resend code
          </button>
        </div>
        <button
          onClick={() => setForgotStep('none')}
          className="mt-2 block mx-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // --- OTP entry screen (customers) ---
  if (creds) {
    const otpBusy = verifying || redirecting
    return (
      <div className="text-center py-2">
        <ShieldCheck className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Enter verification code</h2>
        <p className="text-gray-500 text-sm">
          We sent a 6-digit code to <strong>{creds.email}</strong>. Enter it below to finish signing in.
        </p>

        <form onSubmit={verifyOtp} className="mt-6 space-y-4">
          <input
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="------"
            className="input text-center text-2xl tracking-[0.5em] font-semibold"
          />
          <button
            type="submit"
            disabled={otpBusy || otp.length < 6}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {otpBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {redirecting ? 'Redirecting...' : verifying ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1 text-sm text-gray-500">
          Didn&apos;t get it?
          <button onClick={resendOtp} disabled={otpResending} className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
            {otpResending && <Loader2 className="h-3 w-3 animate-spin" />}
            Resend code
          </button>
        </div>
        <button
          onClick={() => { setCreds(null); setOtp('') }}
          className="mt-2 block mx-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  const handleFormSubmit = handleSubmit(onSubmit)

  // --- Credentials screen ---
  const busy = isSubmitting || redirecting
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your account and continue managing your property.</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

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
          <div className="mt-1.5 text-right">
            <button
              type="button"
              onClick={() => { setForgotEmail(''); setForgotStep('request') }}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {redirecting ? 'Redirecting...' : isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">Create one</Link>
      </p>
    </>
  )
}
