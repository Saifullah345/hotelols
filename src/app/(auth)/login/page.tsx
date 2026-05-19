'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, MailCheck } from 'lucide-react'

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
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Customers added by admin must verify their email before accessing the platform
    if (profile?.role === 'customer' && !user.email_confirmed_at) {
      await supabase.auth.signOut()
      setUnverifiedEmail(data.email)
      return
    }

    const redirect = profile?.role ? roleRedirects[profile.role] : '/'
    router.push(redirect)
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">Create one</Link>
      </p>
    </>
  )
}
