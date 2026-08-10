const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

/**
 * The API key, cleaned up.
 *
 * Values pasted into a .env file routinely arrive wrapped in quotes, with a
 * stray newline, or with "Bearer " already on the front — all of which Paddle
 * rejects with the unhelpful "Authentication header included, but incorrectly
 * formatted".
 */
function apiKey(): string {
  const raw = process.env.PADDLE_API_KEY ?? ''
  return raw.trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim()
}

/**
 * Explains a key that Paddle will certainly reject, before it is sent.
 *
 * The commonest mistake is copying the key's *identifier* from the API keys
 * list (`apikey_01h…`) instead of the secret, which is only shown once when the
 * key is created.
 */
export function apiKeyProblem(): string | null {
  const key = apiKey()
  if (!key) return 'PADDLE_API_KEY is not set on this server.'

  if (!key.startsWith('pdl_')) {
    return key.startsWith('apikey_')
      ? 'PADDLE_API_KEY looks like a key ID from the Paddle list, not the key itself. ' +
        'The real key starts with "pdl_sdbx_apikey_" (sandbox) or "pdl_live_apikey_" and is only ' +
        'shown once, when you create it — create a new API key and copy the full value.'
      : 'PADDLE_API_KEY does not look like a Paddle API key (it should start with "pdl_"). ' +
        'A client-side token ("test_…"/"live_…") will not work here — that one belongs in ' +
        'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.'
  }

  // A sandbox key against the production API fails in a way that looks like a
  // permissions problem rather than a configuration one.
  const sandboxKey = key.includes('_sdbx_')
  const sandboxEnv = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
  if (sandboxKey && !sandboxEnv) {
    return 'PADDLE_API_KEY is a sandbox key but NEXT_PUBLIC_PADDLE_ENV is not "sandbox", ' +
           'so requests go to the production API. Set NEXT_PUBLIC_PADDLE_ENV=sandbox.'
  }
  if (!sandboxKey && sandboxEnv) {
    return 'PADDLE_API_KEY is a live key but NEXT_PUBLIC_PADDLE_ENV is "sandbox", ' +
           'so requests go to the sandbox API. The two must match.'
  }

  return null
}

function paddleFetch(path: string, init?: RequestInit) {
  return fetch(`${PADDLE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

/** False when the server has no Paddle credentials — callers degrade instead of throwing. */
export function paddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY)
}

async function paddleJson<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: string }> {
  // Fail with a reason that says what to change, rather than relaying Paddle's
  // "Authentication header included, but incorrectly formatted".
  const problem = apiKeyProblem()
  if (problem) return { error: problem }

  try {
    const res = await paddleFetch(path, init)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Paddle returns { error: { detail, code } }
      const detail = json?.error?.detail ?? json?.error?.code ?? `Paddle returned ${res.status}`
      return { error: String(detail) }
    }
    return { data: json.data as T }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not reach Paddle' }
  }
}

// ── Catalogue: a plan is one product with a price per billing cycle ──

export type PaddleProduct = { id: string; name: string; status: string }
export type PaddlePrice   = { id: string; product_id: string; status: string }

export async function createPaddleProduct(name: string, description?: string) {
  return paddleJson<PaddleProduct>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name,
      // Paddle rejects an empty string here, so only send real copy.
      ...(description?.trim() ? { description: description.trim() } : {}),
      tax_category: 'standard',
    }),
  })
}

export async function updatePaddleProduct(productId: string, patch: { name?: string; status?: 'active' | 'archived' }) {
  return paddleJson<PaddleProduct>(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

/**
 * Creates a recurring price.
 *
 * Paddle amounts are minor units of the currency as a string ("2900" = $29.00),
 * and a price's amount is immutable — changing what a plan costs means creating
 * a new price and archiving the old one, which `syncPlanPrice` does.
 */
export async function createPaddlePrice(opts: {
  productId: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  description: string
}) {
  return paddleJson<PaddlePrice>('/prices', {
    method: 'POST',
    body: JSON.stringify({
      product_id: opts.productId,
      description: opts.description,
      unit_price: {
        amount: String(Math.round(opts.amount * 100)),
        currency_code: opts.currency,
      },
      billing_cycle: { interval: opts.interval, frequency: 1 },
      tax_mode: 'account_setting',
    }),
  })
}

export async function archivePaddlePrice(priceId: string) {
  return paddleJson<PaddlePrice>(`/prices/${priceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'archived' }),
  })
}

export type PaddlePriceDetail = PaddlePrice & {
  name?: string | null
  unit_price?: { amount: string; currency_code: string }
  billing_cycle?: { interval: string; frequency: number } | null
  /** Present when the price gives a free trial — the reason a first charge is 0. */
  trial_period?: { interval: string; frequency: number } | null
}

export async function getPaddlePrice(priceId: string) {
  return paddleJson<PaddlePriceDetail>(`/prices/${priceId}`)
}

/** Removes (or sets) the free trial on a price. */
export async function setPaddlePriceTrial(
  priceId: string,
  trial: { interval: 'day' | 'week' | 'month' | 'year'; frequency: number } | null,
) {
  return paddleJson<PaddlePriceDetail>(`/prices/${priceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ trial_period: trial }),
  })
}

// ── Lookups used to confirm a checkout without waiting for a webhook ──

export async function getPaddleTransaction(transactionId: string) {
  return paddleJson<Record<string, unknown>>(`/transactions/${transactionId}`)
}

/** Paddle customer for an email address, if one exists. */
export async function findPaddleCustomer(email: string) {
  const res = await paddleJson<Array<{ id: string; email: string }>>(
    `/customers?email=${encodeURIComponent(email)}`,
  )
  return { data: res.data?.[0], error: res.error }
}

/** Subscriptions belonging to a customer, newest first. */
export async function listPaddleSubscriptions(customerId: string) {
  return paddleJson<Array<Record<string, unknown>>>(
    `/subscriptions?customer_id=${encodeURIComponent(customerId)}&order_by=created_at[DESC]`,
  )
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
