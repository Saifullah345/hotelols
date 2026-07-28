'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, MailCheck, ArrowRight } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const roleRedirects: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff: '/staff/dashboard',
  customer: '/',
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

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

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) {
      // Supabase rejects accounts that never clicked the signup confirmation link.
      if (/confirm/i.test(error.message)) { setUnverifiedEmail(data.email); return }
      toast.error(error.message)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    let profile: { role?: string } | null = null
    if (user) {
      try {
        const result = await supabase.from('profiles').select('role').eq('id', user.id).single()
        profile = result.data ?? null
      } catch { profile = null }
    }
    toast.success('Logged in successfully')
    setRedirecting(true)
    router.push(profile?.role ? roleRedirects[profile.role] ?? '/' : '/')
    router.refresh()
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
      const res = await fetch('/api/auth/password-reset/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not send reset code'); return }
      setForgotEmail(email); setForgotStep('confirm'); setResetCode(''); setNewPassword(''); setConfirmPassword('')
      toast.success('If an account exists for that email, a reset code is on its way')
    } finally { setSendingReset(false) }
  }

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetCode.length < 6) { toast.error('Enter the 6-digit code'); return }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setResettingPassword(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Could not reset password'); return }
      toast.success('Password reset! Please sign in with your new password.')
      setForgotStep('none'); setForgotEmail(''); setResetCode(''); setNewPassword(''); setConfirmPassword('')
    } finally { setResettingPassword(false) }
  }

  // ── Email not verified ──
  if (unverifiedEmail) return (
    <div className="text-center">
      <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <MailCheck className="h-7 w-7 text-indigo-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
      <p className="text-sm text-gray-500 mb-1">Your email hasn&apos;t been verified yet.</p>
      <p className="text-sm text-gray-500">Check your inbox for the link we sent to <strong className="text-gray-700">{unverifiedEmail}</strong>.</p>
      <button onClick={resendVerification} disabled={resending} className="mt-6 w-full btn-gradient flex items-center justify-center gap-2">
        {resending && <Loader2 className="h-4 w-4 animate-spin" />}Resend verification email
      </button>
      <button onClick={() => setUnverifiedEmail(null)} className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">Back to sign in</button>
    </div>
  )

  // ── Forgot password: request ──
  if (forgotStep === 'request') return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
        <p className="mt-1.5 text-sm text-gray-500">Enter your email and we&apos;ll send a 6-digit reset code.</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (forgotEmail) sendResetCode(forgotEmail) }} className="space-y-4">
        <Field label="Email address">
          <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className={inputCls} placeholder="you@example.com" autoFocus />
        </Field>
        <button type="submit" disabled={sendingReset || !forgotEmail} className="w-full btn-gradient flex items-center justify-center gap-2">
          {sendingReset && <Loader2 className="h-4 w-4 animate-spin" />}Send reset code
        </button>
      </form>
      <button onClick={() => setForgotStep('none')} className="mt-4 block mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors">Back to sign in</button>
    </div>
  )

  // ── Forgot password: confirm ──
  if (forgotStep === 'confirm') return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Enter reset code</h1>
        <p className="mt-1.5 text-sm text-gray-500">We sent a 6-digit code to <strong className="text-gray-700">{forgotEmail}</strong>.</p>
      </div>
      <form onSubmit={onResetSubmit} className="space-y-4">
        <Field label="Reset code">
          <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="— — — — — —" className={`${inputCls} text-center text-xl tracking-[0.4em] font-semibold`} />
        </Field>
        <Field label="New password">
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
        </Field>
        <Field label="Confirm new password">
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
        </Field>
        <button type="submit" disabled={resettingPassword} className="w-full btn-gradient flex items-center justify-center gap-2">
          {resettingPassword && <Loader2 className="h-4 w-4 animate-spin" />}Reset password
        </button>
      </form>
      <div className="mt-4 text-center text-sm text-gray-500">
        Didn&apos;t get it?{' '}
        <button onClick={() => sendResetCode(forgotEmail)} disabled={sendingReset} className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1">
          {sendingReset && <Loader2 className="h-3 w-3 animate-spin" />}Resend
        </button>
      </div>
      <button onClick={() => setForgotStep('none')} className="mt-2 block mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors">Back to sign in</button>
    </div>
  )

  // ── Main sign in ──
  const busy = isSubmitting || redirecting
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-gray-500">Sign in to your account to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Email address" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputCls} placeholder="you@example.com" />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input {...register('password')} type={showPassword ? 'text' : 'password'} className={`${inputCls} pr-11`} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setForgotEmail(''); setForgotStep('request') }} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors mt-1">
              Forgot password?
            </button>
          </div>
        </Field>

        <button type="submit" disabled={busy} className="w-full btn-gradient flex items-center justify-center gap-2 mt-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {redirecting ? 'Redirecting...' : isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">Create one</Link>
      </p>
    </div>
  )
}
