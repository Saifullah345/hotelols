'use client'

import { useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AutoFilterForm({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const formRef  = useRef<HTMLFormElement>(null)
  const timer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const push = useCallback((delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!formRef.current) return
      const params = new URLSearchParams()
      new FormData(formRef.current).forEach((val, key) => {
        if (val) params.set(key, String(val))
      })
      router.push(`${pathname}?${params.toString()}`)
    }, delay)
  }, [router, pathname])

  return (
    <form
      ref={formRef}
      className={className}
      onInput={e => {
        const tag = (e.target as HTMLElement).tagName
        push(tag === 'SELECT' ? 0 : 400)
      }}
    >
      {children}
    </form>
  )
}
