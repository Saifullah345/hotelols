'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  /** Where the "Complete now" action navigates. */
  href: string
  /** True when the profile is missing details worth filling in. */
  incomplete: boolean
  /** Delay before the nudge appears, in ms. */
  delay?: number
}

// Show the nudge at most once per browser session so it isn't naggy on every
// navigation. Cleared automatically when the tab/session ends.
const SEEN_KEY = 'profile-completion-nudge-seen'

export function ProfileCompletionToast({ href, incomplete, delay = 4000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (!incomplete) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SEEN_KEY)) return

    const timer = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, '1')
      toast('Complete your profile', {
        description: 'Add your name and phone number so booking is faster and easier.',
        duration: 12000,
        action: {
          label: 'Complete now',
          onClick: () => router.push(href),
        },
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [incomplete, href, delay, router])

  return null
}
