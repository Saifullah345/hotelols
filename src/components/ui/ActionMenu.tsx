'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactNode } from 'react'
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

/** Gap between the trigger and the menu. */
const GAP = 4
/** Keep the menu this far clear of the viewport edge. */
const EDGE = 8
/** Never squash the menu below this, scroll it instead. */
const MIN_HEIGHT = 120

/** useLayoutEffect warns when it runs during SSR, and the menu never opens there. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface Position {
  top: number
  left?: number
  right?: number
  maxHeight: number
}

/**
 * A dropdown menu whose panel is rendered through a portal with `position: fixed`,
 * so it is never clipped by an ancestor's `overflow-hidden` (e.g. a `.card`
 * wrapping a table) and always paints above other content. Closes on outside
 * click, Escape, scroll, and resize.
 *
 * The panel opens below its trigger, but flips above it when that would run off
 * the bottom of the window — a row at the end of a long list would otherwise
 * drop its menu past the fold, where scrolling to reach it dismisses it instead.
 * When neither side fits, the panel is capped to the taller side and scrolls.
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
  const [pos, setPos] = useState<Position | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  // Measured once the panel is in the DOM, so its real height decides the side.
  const place = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const t = trigger.getBoundingClientRect()
    const height = menuRef.current?.offsetHeight ?? 0

    const roomBelow = window.innerHeight - t.bottom - GAP - EDGE
    const roomAbove = t.top - GAP - EDGE

    // Below unless it doesn't fit and there is more room the other way.
    const flip = height > roomBelow && roomAbove > roomBelow
    const room = Math.max(MIN_HEIGHT, flip ? roomAbove : roomBelow)

    setPos({
      top: flip
        ? Math.max(EDGE, t.top - GAP - Math.min(height, room))
        : t.bottom + GAP,
      ...(align === 'right'
        ? { right: Math.max(EDGE, window.innerWidth - t.right) }
        : { left: Math.max(EDGE, t.left) }),
      maxHeight: room,
    })
  }, [align])

  useIsoLayoutEffect(() => {
    if (open) place()
    else setPos(null)
  }, [open, place])

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
    const onScroll = (e: Event) => {
      // A capped menu scrolls internally; only scrolling the page behind it dismisses.
      if (menuRef.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    // capture phase so scrolls in any scroll container also dismiss the menu
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
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
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos?.top ?? 0,
            ...(align === 'right' ? { right: pos?.right ?? 0 } : { left: pos?.left ?? 0 }),
            maxHeight: pos?.maxHeight,
            overflowY: 'auto',
            // Hidden for the one frame between mounting and being measured.
            visibility: pos ? 'visible' : 'hidden',
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
