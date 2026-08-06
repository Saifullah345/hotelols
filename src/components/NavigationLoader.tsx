'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationLoader() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPath = useRef(pathname)

  // Start bar on link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#') || link.target === '_blank') return
      const nextPath = href.split('?')[0].split('#')[0]
      if (!nextPath || nextPath === window.location.pathname) return

      // Start progress bar immediately
      setProgress(0)
      setVisible(true)

      // Simulate progress: fast to 70%, then slow crawl
      let current = 0
      timerRef.current = setInterval(() => {
        current += current < 70 ? Math.random() * 12 : Math.random() * 2
        if (current > 92) current = 92
        setProgress(current)
      }, 100)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Complete bar when navigation finishes
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      if (timerRef.current) clearInterval(timerRef.current)
      setProgress(100)
      const hide = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(hide)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? 'width 0.15s ease-out' : 'width 0.1s ease-out',
        }}
      />
    </div>
  )
}
