'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationLoader() {
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  // Hide spinner once navigation completes (pathname has changed)
  useEffect(() => {
    setLoading(false)
  }, [pathname])

  // Detect link clicks and show spinner for same-origin navigations
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a')
      if (!link || link.target === '_blank' || link.getAttribute('href')?.startsWith('#')) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('mailto')) return
      // Only show for path changes (not just hash/query changes on same page)
      const nextPath = href.split('?')[0].split('#')[0]
      if (nextPath && nextPath !== window.location.pathname) {
        setLoading(true)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
      <div className="w-10 h-10 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
    </div>
  )
}
