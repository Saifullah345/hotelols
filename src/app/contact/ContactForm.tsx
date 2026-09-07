'use client'

import { useState } from 'react'
import {
  CheckCircle2, Loader2, Send,
  User, Mail, Phone, Tag, MessageSquare, ChevronDown,
} from 'lucide-react'
import { CONTACT_TOPICS, validateContact } from '@/lib/contact'

const EMPTY = { full_name: '', email: '', phone: '', topic: '', message: '' }

/** Shared by every field: room on the left for the icon that labels it. */
const FIELD = 'w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500'

/** The icon itself — decorative, since every field carries a real label. */
const ICON = 'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'

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
      <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-xl shadow-primary-900/5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-gray-900">Message sent</h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Thanks for getting in touch — we reply within 24 hours, usually sooner.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-semibold text-primary-600 hover:text-primary-700"
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
      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-primary-900/5 sm:p-8"
    >
      <h2 className="text-lg font-bold text-gray-900">Send us a message</h2>
      <p className="mt-1.5 text-sm text-gray-500">
        Fill out the form below and we&apos;ll get back to you as soon as possible.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <label className="sr-only" htmlFor="contact-name">Full name</label>
          <User className={ICON} aria-hidden="true" />
          <input
            id="contact-name"
            className={FIELD}
            placeholder="Full Name*"
            autoComplete="name"
            maxLength={80}
            value={form.full_name}
            onChange={set('full_name')}
          />
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="contact-email">Work email</label>
          <Mail className={ICON} aria-hidden="true" />
          <input
            id="contact-email"
            type="email"
            className={FIELD}
            placeholder="Work Email*"
            autoComplete="email"
            maxLength={254}
            value={form.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div className="relative mt-3">
        <label className="sr-only" htmlFor="contact-phone">Phone number, optional</label>
        <Phone className={ICON} aria-hidden="true" />
        <input
          id="contact-phone"
          type="tel"
          className={FIELD}
          placeholder="Phone Number (Optional)"
          autoComplete="tel"
          maxLength={20}
          value={form.phone}
          onChange={set('phone')}
        />
      </div>

      <div className="relative mt-3">
        <label className="sr-only" htmlFor="contact-topic">Topic of interest</label>
        <Tag className={ICON} aria-hidden="true" />
        {/* The native arrow is dropped so the chevron lines up with the rest of
            the card; the select itself is untouched and still opens natively. */}
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <select
          id="contact-topic"
          className={`${FIELD} appearance-none pr-10 ${form.topic ? 'text-gray-900' : 'text-gray-400'}`}
          value={form.topic}
          onChange={set('topic')}
        >
          <option value="">Topic of Interest*</option>
          {CONTACT_TOPICS.map(topic => (
            <option key={topic} value={topic} className="text-gray-900">{topic}</option>
          ))}
        </select>
      </div>

      <div className="relative mt-3">
        <label className="sr-only" htmlFor="contact-message">Your message</label>
        {/* Pinned near the top rather than centred: the box grows as they type. */}
        <MessageSquare
          className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <textarea
          id="contact-message"
          className={`${FIELD} min-h-[132px] resize-y`}
          placeholder="Your Message*"
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Send Message
          </>
        )}
      </button>

      <p className="mt-4 text-center text-xs text-gray-400">
        We use your details to reply to this enquiry, nothing else.
      </p>
    </form>
  )
}
