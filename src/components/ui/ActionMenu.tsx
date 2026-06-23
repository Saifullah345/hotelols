'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ActionMenuProps {
  /** Content rendered inside the trigger button (icon, text, etc.). */
  button: ReactNode
  buttonClassName?: string
  buttonAriaLabel?: string
  /** Which edge of the trigger the menu aligns to. */
  align?: 'left' | 'right'
  menuClassName?: string
  /** Render-prop for menu contents; call `close` after an action runs. */
  children: (close: () => void) => ReactNode
}

/**
 * A dropdown menu whose panel is rendered through a portal with `position: fixed`,
 * so it is never clipped by an ancestor's `overflow-hidden` (e.g. a `.card`
 * wrapping a table) and always paints above other content. Closes on outside
 * click, Escape, scroll, and resize.
 */
export function ActionMenu({
  button,
  buttonClassName,
  buttonAriaLabel,
  align = 'right',
  menuClassName,
  children,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  const reposition = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({ top: r.bottom + 4, left: r.left, right: window.innerWidth - r.right })
  }

  useEffect(() => {
    if (open) reposition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        close()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onMove = () => close()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onMove)
    // capture phase so scrolls in any scroll container also dismiss the menu
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={buttonAriaLabel}
        onClick={() => setOpen(o => !o)}
        className={buttonClassName}
      >
        {button}
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: coords.top,
            ...(align === 'right' ? { right: coords.right } : { left: coords.left }),
          }}
          className={
            menuClassName ??
            'z-50 min-w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1'
          }
        >
          {children(close)}
        </div>,
        document.body,
      )}
    </>
  )
}
