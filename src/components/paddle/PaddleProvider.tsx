'use client'

import { useEffect } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

let paddleInstance: Paddle | null = null

export function getPaddle(): Paddle | null {
  return paddleInstance
}

/** Fired once a completed checkout has been applied to the hotel. */
export const SUBSCRIPTION_EVENT = 'bookqayam:subscription-updated'

export default function PaddleProvider() {
  useEffect(() => {
    if (paddleInstance) return

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) {
      // Without a token Paddle.js loads but every checkout fails with its own
      // generic "Something went wrong" overlay, which says nothing about why.
      console.warn('[paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set — checkout will not open.')
      return
    }

    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') ?? 'sandbox',
      token,
      eventCallback: event => {
        // Paddle's overlay only ever says "Something went wrong"; the real
        // reason is in the event, so put it where it can be read.
        if (event.name === 'checkout.error') {
          console.error('[paddle] checkout error:', event.data)
        }

        if (event.name === 'checkout.completed') {
          // Webhooks can't reach a local dev server, and can be missed in
          // production — confirm straight away rather than waiting for one.
          const transactionId = (event.data as { transaction_id?: string } | undefined)?.transaction_id
          fetch('/api/paddle/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId }),
          })
            .then(async res => {
              const json = await res.json().catch(() => ({}))
              window.dispatchEvent(new CustomEvent(SUBSCRIPTION_EVENT, {
                detail: { ok: res.ok, ...json },
              }))
            })
            .catch(() => {
              window.dispatchEvent(new CustomEvent(SUBSCRIPTION_EVENT, {
                detail: { ok: false, error: 'Could not confirm the payment' },
              }))
            })
        }
      },
    }).then(p => {
      if (p) paddleInstance = p
    }).catch(err => {
      console.error('[paddle] failed to initialise:', err)
    })
  }, [])

  return null
}
