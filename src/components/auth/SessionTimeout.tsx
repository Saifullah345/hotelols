'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000  // 8 hours
const WARN_BEFORE_MS      = 5 * 60 * 1000         // warn 5 min before
const CHECK_INTERVAL_MS   = 60 * 1000             // check every 1 minute
const STORAGE_KEY         = 'hotelos:lastActivity'
const WARN_TOAST_ID       = 'session-timeout-warn'

const PROTECTED = ['/hotel-admin', '/super-admin', '/staff', '/customer']

const INVALID_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'invalid_grant',
  'session_not_found',
  'user_not_found',
])

export default function SessionTimeout() {
  const router   = useRouter()
  const pathname = usePathname()

  // ── Auth error listener — catches expired / revoked refresh tokens ────
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORAGE_KEY)
      }
      // TOKEN_REFRESHED failure surfaces as SIGNED_OUT with no session;
      // we also watch for the error event on the client
    })

    // Intercept failed token refreshes by checking getSession errors
    const interval = setInterval(async () => {
      const isProtected = PROTECTED.some(p => pathname.startsWith(p))
      if (!isProtected) return
      const { error } = await supabase.auth.getUser()
      if (error) {
        const code = (error as { code?: string }).code ?? ''
        if (INVALID_TOKEN_CODES.has(code) || error.status === 400) {
          clearInterval(interval)
          await supabase.auth.signOut()
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.setItem('hotelos:logoutReason', 'expired')
          router.push('/login')
        }
      }
    }, 5 * 60 * 1000) // check every 5 minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [pathname, router])

  // ── Inactivity timeout ────────────────────────────────────────────────
  useEffect(() => {
    const isProtected = PROTECTED.some(p => pathname.startsWith(p))
    if (!isProtected) return

    function stampActivity() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      toast.dismiss(WARN_TOAST_ID)
    }

    async function checkIdle() {
      const raw  = localStorage.getItem(STORAGE_KEY)
      const last = raw ? parseInt(raw, 10) : 0
      if (!last) { stampActivity(); return }

      const idle = Date.now() - last

      if (idle >= INACTIVITY_LIMIT_MS) {
        const supabase = createClient()
        await supabase.auth.signOut()
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.setItem('hotelos:logoutReason', 'timeout')
        router.push('/login')
        return
      }

      if (idle >= INACTIVITY_LIMIT_MS - WARN_BEFORE_MS) {
        const minsLeft = Math.ceil((INACTIVITY_LIMIT_MS - idle) / 60_000)
        toast.warning(
          `You will be signed out in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''} due to inactivity.`,
          { id: WARN_TOAST_ID, duration: Infinity }
        )
      }
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    events.forEach(e => window.addEventListener(e, stampActivity, { passive: true }))

    if (!localStorage.getItem(STORAGE_KEY)) stampActivity()

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS)
    checkIdle()

    return () => {
      events.forEach(e => window.removeEventListener(e, stampActivity))
      clearInterval(interval)
    }
  }, [pathname, router])

  return null
}
