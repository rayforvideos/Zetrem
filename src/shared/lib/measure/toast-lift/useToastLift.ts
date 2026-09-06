import { useEffect } from 'react'
import { TOAST_LIFT_VAR, toastLift } from './toast-lift'
import type { FootBox } from './toast-lift.types'

// What stands at the foot of the conversation: the composer, and the
// permission card that takes its place while an ask is pending. Both live
// inside the terminal tile, which is what keeps the team sidebar's own form
// out of this, since that one is a dialog in a portal on the body.
const FOOT = '[data-terminal-tile] [data-approval], [data-terminal-tile] form'

// Keeps the toaster's bottom offset over the foot of the conversation. The
// screen is read rather than told: the composer belongs to the conversation
// widget and the toaster to the app shell, and neither is in a position to
// hand the other its height.
export function useToastLift(): void {
  useEffect(() => {
    const root = document.documentElement
    let shown = -1
    let pending = 0
    let watched: Element | null = null
    const sizes = new ResizeObserver(() => schedule())

    function measure(): void {
      pending = 0
      const box = foot()
      const el = box === null ? null : box.el
      if (el !== watched) {
        sizes.disconnect()
        watched = el
        if (el !== null) sizes.observe(el)
      }
      const next = toastLift({
        foot: box === null ? null : box.rect,
        windowW: window.innerWidth,
        windowH: window.innerHeight,
      })
      if (next === shown) return
      shown = next
      root.style.setProperty(TOAST_LIFT_VAR, `${next}px`)
    }

    // Measuring costs a layout read, so a burst of changes is one measurement
    // on the next frame rather than one each.
    function schedule(): void {
      if (pending !== 0) return
      pending = requestAnimationFrame(measure)
    }

    // The foot box is swapped, not resized, when a permission ask arrives or
    // the person moves to another gate, and a size observer hears nothing
    // about that.
    const swaps = new MutationObserver(schedule)
    swaps.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    measure()

    return () => {
      if (pending !== 0) cancelAnimationFrame(pending)
      window.removeEventListener('resize', schedule)
      swaps.disconnect()
      sizes.disconnect()
      root.style.removeProperty(TOAST_LIFT_VAR)
    }
  }, [])
}

// The highest of the foot boxes on screen. Clearing the highest clears them
// all, and a gate that shows none leaves the toast where it has always stood.
function foot(): { el: Element; rect: FootBox } | null {
  let found: { el: Element; rect: FootBox } | null = null
  for (const el of document.querySelectorAll(FOOT)) {
    const { top, bottom, left, right } = el.getBoundingClientRect()
    if (found === null || top < found.rect.top) found = { el, rect: { top, bottom, left, right } }
  }
  return found
}
