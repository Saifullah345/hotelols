'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { CONTACT_TOPICS, validateContact } from '@/lib/contact'

const EMPTY = { full_name: '', email: '', phone: '', topic: '', message: '' }

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const set = (field: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return

    // Same check the route runs, just without the round trip.
    const checked = validateContact(form)
    if (!checked.ok) {
      setError(checked.error)
      return
    }

    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checked.value),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not send your message. Please try again.')
        return
      }
      setSent(true)
      setForm(EMPTY)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/70 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">Message sent</h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Thanks for getting in touch — we reply within 24 hours, usually sooner.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-gray-100 bg-gray-50/70 p-6 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="sr-only" htmlFor="contact-name">Full name</label>
          <input
            id="contact-name"
            className="input"
            placeholder="Full Name"
            autoComplete="name"
            maxLength={80}
            value={form.full_name}
            onChange={set('full_name')}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="contact-email">Work email</label>
          <input
            id="contact-email"
            type="email"
            className="input"
            placeholder="Work Email"
            autoComplete="email"
            maxLength={254}
            value={form.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="sr-only" htmlFor="contact-phone">Phone number, optional</label>
        <input
          id="contact-phone"
          type="tel"
          className="input"
          placeholder="Phone Number (Optional)"
          autoComplete="tel"
          maxLength={20}
          value={form.phone}
          onChange={set('phone')}
        />
      </div>

      <div className="mt-3">
        <label className="sr-only" htmlFor="contact-topic">Topic of interest</label>
        <select
          id="contact-topic"
          className={`input ${form.topic ? 'text-gray-900' : 'text-gray-400'}`}
          value={form.topic}
          onChange={set('topic')}
        >
          <option value="">Topic of Interest</option>
          {CONTACT_TOPICS.map(topic => (
            <option key={topic} value={topic} className="text-gray-900">{topic}</option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <label className="sr-only" htmlFor="contact-message">Your message</label>
        <textarea
          id="contact-message"
          className="input min-h-[120px] resize-y"
          placeholder="Your Message"
          maxLength={2000}
          value={form.message}
          onChange={set('message')}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            Send Message
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-gray-400">
        We use your details to reply to this enquiry, nothing else.
      </p>
    </form>
  )
}
