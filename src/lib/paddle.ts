const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

const PADDLE_API_KEY = process.env.PADDLE_API_KEY!

function paddleFetch(path: string, init?: RequestInit) {
  return fetch(`${PADDLE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

export async function getPaddleSubscription(subscriptionId: string) {
  const res = await paddleFetch(`/subscriptions/${subscriptionId}`)
  if (!res.ok) return null
  const json = await res.json()
  return json.data as PaddleSubscription
}

export async function cancelPaddleSubscription(subscriptionId: string) {
  const res = await paddleFetch(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: 'next_billing_period' }),
  })
  return res.ok
}

export async function updatePaddleSubscription(subscriptionId: string, priceId: string) {
  const res = await paddleFetch(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      proration_billing_mode: 'prorated_immediately',
    }),
  })
  return res.ok
}

export type PaddleSubscription = {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing'
  customer_id: string
  current_billing_period: { starts_at: string; ends_at: string } | null
  next_billed_at: string | null
  items: Array<{ price: { id: string; product_id: string }; quantity: number }>
}

/** Verify a Paddle webhook signature.
 *  Returns the parsed event body if valid, null if signature check fails. */
export async function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<Record<string, unknown> | null> {
  if (!signatureHeader) return null

  // Paddle sends: "ts=<timestamp>;h1=<hex_signature>"
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('=') as [string, string])
  )
  const ts  = parts['ts']
  const h1  = parts['h1']
  if (!ts || !h1) return null

  const secret = process.env.PADDLE_WEBHOOK_SECRET!
  const signed = `${ts}:${rawBody}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (hex !== h1) return null
  return JSON.parse(rawBody)
}
