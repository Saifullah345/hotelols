import { isValidEmail } from '@/lib/validation'
import { stripHtml } from '@/lib/sanitize'

/** Options in the "Topic of interest" select. The API rejects anything else, so
 *  add here first — the value is stored verbatim on `contact_messages.topic`. */
export const CONTACT_TOPICS = [
  'Booking support',
  'List my hotel',
  'Pricing and plans',
  'Partnership',
  'Something else',
] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export type ContactInput = {
  full_name: string
  email: string
  phone: string
  topic: string
  message: string
}

/**
 * Validates and cleans one submission. Shared by the form and the route so the
 * browser and the server agree on what is acceptable — the route runs it again
 * regardless, since nothing stops a caller posting straight at the endpoint.
 *
 * Returns the cleaned values, or the first problem found as a message meant to
 * be shown to the sender.
 */
export function validateContact(input: Partial<ContactInput>):
  | { ok: true; value: ContactInput }
  | { ok: false; error: string } {
  const fullName = stripHtml(String(input.full_name ?? '')).trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const phone = stripHtml(String(input.phone ?? '')).trim()
  const topic = String(input.topic ?? '').trim()
  const message = stripHtml(String(input.message ?? '')).trim()

  if (fullName.length < 2)   return { ok: false, error: 'Please enter your full name' }
  if (fullName.length > 80)  return { ok: false, error: 'Name cannot exceed 80 characters' }
  if (!/[a-zA-ZÀ-ɏ]/.test(fullName)) return { ok: false, error: 'Please enter your full name' }

  if (!email)                return { ok: false, error: 'Please enter your email address' }
  if (email.length > 254 || !isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address' }
  }

  // Optional, so only checked when something was typed. Deliberately loose:
  // people write numbers with spaces, dashes and brackets, and rejecting a
  // reachable number over its punctuation loses a lead for nothing.
  if (phone && !/^[+\d][\d\s\-()]{5,19}$/.test(phone)) {
    return { ok: false, error: 'Please enter a valid phone number, or leave it blank' }
  }

  if (!topic)                return { ok: false, error: 'Please choose a topic' }
  if (!(CONTACT_TOPICS as readonly string[]).includes(topic)) {
    return { ok: false, error: 'Please choose a topic from the list' }
  }

  if (message.length < 10)   return { ok: false, error: 'Please write at least a sentence or two' }
  if (message.length > 2000) return { ok: false, error: 'Message cannot exceed 2000 characters' }
  if (!/[a-zA-ZÀ-ɏ]/.test(message)) return { ok: false, error: 'Please write your message' }

  return { ok: true, value: { full_name: fullName, email, phone, topic, message } }
}
