import { CHROME_TOP, USAGE_BAR } from '@/shared/config/theme'
import type { FootBox } from './toast-lift.types'

// The custom property the toaster reads its bottom offset from. It is written
// on the document root instead of passed as a prop, so that a composer growing
// by a line moves the toast without rendering the screen again.
export const TOAST_LIFT_VAR = '--zt-toast-lift'

// The room a toast keeps between itself and whatever it stands above.
const GAP = 12

// With nothing at the foot of the conversation to clear, the toast stands just
// clear of the status bar, which is where it has always stood.
export const TOAST_FLOOR = USAGE_BAR.height + GAP

// The corner a toast occupies at rest: sonner's own toast width and the right
// offset it is given, and enough height for the few it stacks. Read as the
// room the toast would take, not as the room it takes now, so a wait raised
// later lands where an empty screen was measured for.
const TOAST_W = 356 + 16
const TOAST_H = 240

// Room under the titlebar for the toast itself. A toast pushed higher than
// this reads as a window of its own rather than a word about the work, and a
// foot box that tall has taken the screen anyway.
const CEILING_ROOM = 120

// How far above the bottom of the window a toast stands. The foot of the
// conversation holds the thing the person is reaching for, the send button or
// the permission card's own buttons, and a toast landing on it hides that
// button for as long as it lasts (#85). So the toast is lifted over the foot
// box whenever the corner it would rest in is the corner the box is in.
// Measured rather than assumed: the composer grows with what is typed, with
// what is attached, and with the teammate it is addressed to, and it does not
// always sit at the foot at all, so a constant either covers it or lifts the
// toast into the middle of an empty screen.
export function toastLift(at: { foot: FootBox | null; windowW: number; windowH: number }): number {
  if (at.foot === null || !inTheCorner(at.foot, at.windowW, at.windowH)) return TOAST_FLOOR
  const ceiling = Math.max(TOAST_FLOOR, at.windowH - CHROME_TOP - CEILING_ROOM)
  const above = Math.round(at.windowH - at.foot.top + GAP)
  return Math.min(Math.max(above, TOAST_FLOOR), ceiling)
}

function inTheCorner(foot: FootBox, windowW: number, windowH: number): boolean {
  const bottom = windowH - TOAST_FLOOR
  return (
    foot.right > windowW - TOAST_W &&
    foot.left < windowW &&
    foot.bottom > bottom - TOAST_H &&
    foot.top < bottom
  )
}
