'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Loader2, Mail } from 'lucide-react'

type Status = 'idle' | 'sending' | 'done' | 'error'

/**
 * The email capture inside the footer band. Kept apart from PublicFooter so the
 * footer stays a plain list of links and only this one field carries state.
 */
export default function NewsletterSignup() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError]   = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'sending') return

    setStatus('sending')
    setError('')

    try {
      const res  = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Could not subscribe you. Please try again.')
        setStatus('error')
        return
      }

      setEmail('')
      setStatus('done')
    } catch {
      setError('Could not reach the server. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-white/80 px-5 py-4 ring-1 ring-indigo-100">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-gray-700">
          You&apos;re on the list — watch your inbox for the next update.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-indigo-100/80 sm:flex-row sm:items-center">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <div className="flex flex-1 items-center gap-2.5 px-3">
          <Mail className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="Enter your email address"
            autoComplete="email"
            className="w-full bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
        >
          {status === 'sending'
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            : <>Subscribe <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
        </button>
      </div>

      {status === 'error' && (
        <p role="alert" className="mt-2 px-2 text-xs font-medium text-red-600">{error}</p>
      )}
    </form>
  )
}
