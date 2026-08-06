'use client'

import { useEffect } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

let paddleInstance: Paddle | null = null

export function getPaddle(): Paddle | null {
  return paddleInstance
}

export default function PaddleProvider() {
  useEffect(() => {
    if (paddleInstance) return
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') ?? 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then(p => {
      if (p) paddleInstance = p
    })
  }, [])

  return null
}
