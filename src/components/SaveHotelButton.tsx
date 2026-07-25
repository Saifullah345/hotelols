'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { toggleSaveHotel } from '@/app/actions/savedHotels'

interface Props {
  hotelId: string
  initialSaved: boolean
  isLoggedIn: boolean
  variant?: 'card' | 'detail'
}

export default function SaveHotelButton({ hotelId, initialSaved, isLoggedIn, variant = 'card' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()
  const [showPrompt, setShowPrompt] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close when clicking anywhere outside the tooltip
  useEffect(() => {
    if (!showPrompt) return
    const close = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return
      setShowPrompt(false)
    }
    // Delay so the same click that opened it doesn't close it immediately
    const id = setTimeout(() => document.addEventListener('click', close), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('click', close)
    }
  }, [showPrompt])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()    // don't navigate the card Link
    e.stopPropagation()   // don't bubble to card Link

    if (!isLoggedIn) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setTooltipStyle({
          position: 'fixed',
          // Place tooltip above the button, right-aligned
          top: rect.top - 8,
          left: rect.right,
          transform: 'translateX(-100%) translateY(-100%)',
          zIndex: 9999,
        })
      }
      setShowPrompt(v => !v)
      return
    }

    startTransition(async () => {
      const result = await toggleSaveHotel(hotelId)
      if (result.saved !== undefined) setSaved(result.saved)
    })
  }

  const isCard = variant === 'card'

  const tooltip = mounted && showPrompt
    ? createPortal(
        <div
          style={tooltipStyle}
          className="w-44 rounded-xl bg-gray-900 px-3 py-3 text-center shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-white/80 mb-2">Sign in to save hotels</p>
          <Link
            href="/login"
            className="inline-block text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          {/* Arrow pointing down toward the button */}
          <div className="absolute -bottom-1.5 right-3 w-3 h-3 rotate-45 bg-gray-900" />
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={saved ? 'Remove from saved' : 'Save hotel'}
        className={`flex items-center justify-center rounded-full bg-white/90 shadow backdrop-blur transition-all hover:scale-110 active:scale-95 disabled:opacity-60
          ${isCard ? 'w-8 h-8' : 'w-10 h-10'}`}
      >
        <Heart
          className={`transition-colors ${isCard ? 'h-4 w-4' : 'h-5 w-5'} ${
            saved ? 'fill-red-500 text-red-500' : 'text-gray-500'
          }`}
        />
      </button>
      {tooltip}
    </>
  )
}
