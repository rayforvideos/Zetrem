import type {
  Box,
  PlaceRequest,
  Size,
  TooltipSpot,
  TourPlacement,
  TourSignal,
  TourStep,
} from './tour.types'

// Frames the light keeps re-measuring after a target first appears, long
// enough to cover the app's own entrance of it.
export const SETTLE_FRAMES = 40

export const TOUR = {
  // Air between the target and the card, and between the card and the edge.
  gapPx: 12,
  edgeMarginPx: 16,
  // The spotlight is cut a little wider than the element so a control does not
  // sit flush against the dark.
  spotlightPadPx: 8,
  // Long enough to read two lines, short enough that nobody waits on it.
  autoDelayMs: 2600,
  // A target that has not rendered by now is one this build does not have.
  waitForTargetMs: 4000,
} as const

// Whether this step answers to what just happened. Anything that ends the tour
// is answered by every step; the rest belong to one kind of step only.
export function acceptsSignal(step: TourStep, signal: TourSignal): boolean {
  switch (signal) {
    case 'quit':
    case 'skip':
    case 'target-missing':
      return true
    case 'target-click':
      return step.advance === 'click' && step.target !== null
    case 'delay-done':
      return step.advance === 'auto'
    case 'next-pressed':
      // A click step is the one place the button is withheld: the point of it
      // is that the reviewer touches the real control, and a way around that
      // is a way to miss what the step was showing.
      return step.advance !== 'click'
  }
}

// Where the tour stands after a signal: the next index, the same index when
// the step does not answer to it, or null when the tour is over.
export function stepAfter(steps: TourStep[], at: number, signal: TourSignal): number | null {
  const step = steps[at]
  if (step === undefined) return null
  if (!acceptsSignal(step, signal)) return at
  if (signal === 'quit' || signal === 'skip') return null
  const next = at + 1
  return next < steps.length ? next : null
}

// How long this step runs before it moves on by itself, or null when it waits
// for a person instead.
export function delayFor(step: TourStep): number | null {
  if (step.advance !== 'auto') return null
  return step.delayMs ?? TOUR.autoDelayMs
}

// Whether the card carries a Next button for this step.
export function wantsNextButton(step: TourStep): boolean {
  return acceptsSignal(step, 'next-pressed')
}

// The hole the dark is cut away from: the target padded out, then held inside
// the screen so a target half off the edge does not drag the hole off with it.
export function spotlight(target: Box, viewport: Size, pad: number = TOUR.spotlightPadPx): Box {
  const top = Math.max(0, target.top - pad)
  const left = Math.max(0, target.left - pad)
  const right = Math.min(viewport.width, target.left + target.width + pad)
  const bottom = Math.min(viewport.height, target.top + target.height + pad)
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

// Whether the target is on screen at all. Scrolled out of view, a step has
// nothing to point at and is better skipped than spotlighting an empty corner.
export function isOnScreen(target: Box, viewport: Size): boolean {
  if (target.width <= 0 || target.height <= 0) return false
  if (target.top >= viewport.height || target.left >= viewport.width) return false
  return target.top + target.height > 0 && target.left + target.width > 0
}

// The side asked for first, then the opposite one, then the two across. The
// opposite side comes second because flipping keeps the card reading against
// the same edge of the target.
const FALLBACKS: Record<TourPlacement, TourPlacement[]> = {
  bottom: ['bottom', 'top', 'right', 'left'],
  top: ['top', 'bottom', 'right', 'left'],
  left: ['left', 'right', 'bottom', 'top'],
  right: ['right', 'left', 'bottom', 'top'],
}

// Where the card sits beside the target, on the side asked for if it fits
// there and on another side if it does not, and never past the screen edge.
export function placeTooltip({
  target,
  tooltip,
  viewport,
  placement = 'bottom',
  gap = TOUR.gapPx,
  margin = TOUR.edgeMarginPx,
}: PlaceRequest): TooltipSpot {
  const sides = FALLBACKS[placement]
  const taken =
    sides.find((side) =>
      fits(side, anchor(side, target, tooltip, gap), tooltip, viewport, margin),
    ) ?? placement
  const spot = anchor(taken, target, tooltip, gap)
  return {
    placement: taken,
    top: clamp(spot.top, margin, viewport.height - margin - tooltip.height),
    left: clamp(spot.left, margin, viewport.width - margin - tooltip.width),
  }
}

// The card centred on the target along the side it takes, before any clamping.
function anchor(
  side: TourPlacement,
  target: Box,
  tooltip: Size,
  gap: number,
): { top: number; left: number } {
  const middleX = target.left + target.width / 2 - tooltip.width / 2
  const middleY = target.top + target.height / 2 - tooltip.height / 2
  switch (side) {
    case 'top':
      return { top: target.top - gap - tooltip.height, left: middleX }
    case 'bottom':
      return { top: target.top + target.height + gap, left: middleX }
    case 'left':
      return { top: middleY, left: target.left - gap - tooltip.width }
    case 'right':
      return { top: middleY, left: target.left + target.width + gap }
  }
}

// Only the axis the side owns decides whether it fits. The other axis is
// clamped in a moment, so a card that hangs off sideways is not a reason to
// throw away a side that had room where it mattered.
function fits(
  side: TourPlacement,
  spot: { top: number; left: number },
  tooltip: Size,
  viewport: Size,
  margin: number,
): boolean {
  switch (side) {
    case 'top':
      return spot.top >= margin
    case 'bottom':
      return spot.top + tooltip.height <= viewport.height - margin
    case 'left':
      return spot.left >= margin
    case 'right':
      return spot.left + tooltip.width <= viewport.width - margin
  }
}

// A card taller or wider than the room left over has no range to be held in,
// and is put against the near margin rather than nowhere.
function clamp(value: number, low: number, high: number): number {
  if (high < low) return low
  return Math.min(Math.max(value, low), high)
}
