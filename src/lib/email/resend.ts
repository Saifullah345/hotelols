// Thin wrapper around the Resend REST API. We call the HTTP endpoint directly
// instead of pulling in the SDK to keep the dependency surface small.

interface EmailAttachment {
  filename: string
  /** Base64-encoded file content. */
  content: string
}

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  // Falls back to our verified Resend domain. onboarding@resend.dev is NOT used
  // because that test sender can only deliver to your own Resend account email.
  const from = process.env.RESEND_FROM || 'HotelOS <noreply@hotelmanagement.n6solution.com>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, attachments }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend request failed (${res.status}): ${detail || res.statusText}`)
  }
}
