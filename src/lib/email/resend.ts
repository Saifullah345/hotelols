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
  const from = process.env.RESEND_FROM || 'BookQayam <noreply@bookqayam.com>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, attachments }),
  })

  if (!res.ok) {
    throw new Error(await describeFailure(res, from))
  }
}

/**
 * A sentence the person who triggered the email can act on.
 *
 * The raw body is a Resend error envelope — surfacing it verbatim put
 * `{"statusCode":401,"name":"validation_error","message":"API key is invalid"}`
 * in front of a hotel admin adding a staff member, who can neither read nor fix
 * it. The cases below name the thing that is actually wrong and who has to
 * change it; anything unrecognised still falls back to Resend's own message so
 * nothing is swallowed.
 */
async function describeFailure(res: Response, from: string): Promise<string> {
  const body = await res.text().catch(() => '')
  let message = ''
  try {
    message = (JSON.parse(body) as { message?: string }).message ?? ''
  } catch {
    message = body
  }

  if (res.status === 401 || res.status === 403) {
    return 'the email service rejected our API key. An administrator needs to set a valid RESEND_API_KEY in the deployment environment.'
  }
  if (res.status === 422 && /domain/i.test(message)) {
    return `the sender address (${from}) is not verified with the email service yet.`
  }
  if (res.status === 429) {
    return 'the email service is rate-limiting us. Try again in a few minutes.'
  }
  return message || res.statusText || `the email service returned ${res.status}.`
}
