'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      allowNestedScroll: true,
    })

    let frame: number
    function raf(time: number) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    // Images finish loading after mount and make the page taller; without a
    // re-measure the scroll stops at whatever the height was at first paint.
    const remeasure = () => lenis.resize()
    window.addEventListener('load', remeasure)

    return () => {
      window.removeEventListener('load', remeasure)
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return null
}
