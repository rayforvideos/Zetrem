import { describe, expect, it } from 'vitest'
import {
  TOUR,
  acceptsSignal,
  delayFor,
  isOnScreen,
  placeTooltip,
  spotlight,
  stepAfter,
  wantsNextButton,
} from './tour'
import type { Size, TourStep } from './tour.types'

function step(patch: Partial<TourStep> = {}): TourStep {
  return {
    id: 'one',
    target: '#one',
    title: 'Title',
    body: 'Body',
    advance: 'manual',
    ...patch,
  }
}

const SCREEN: Size = { width: 1000, height: 800 }
const CARD: Size = { width: 320, height: 160 }

describe('acceptsSignal: which step answers to what', () => {
  it('lets a click step move on when its target is clicked', () => {
    expect(acceptsSignal(step({ advance: 'click' }), 'target-click')).toBe(true)
    expect(acceptsSignal(step({ advance: 'auto' }), 'target-click')).toBe(false)
  })

  it('never waits for a click on a step with nothing to click', () => {
    expect(acceptsSignal(step({ advance: 'click', target: null }), 'target-click')).toBe(false)
  })

  it('lets only a timed step move on when its time is up', () => {
    expect(acceptsSignal(step({ advance: 'auto' }), 'delay-done')).toBe(true)
    expect(acceptsSignal(step({ advance: 'manual' }), 'delay-done')).toBe(false)
  })

  it('withholds the button from a click step, which is the one asking for a press', () => {
    expect(wantsNextButton(step({ advance: 'click' }))).toBe(false)
    expect(wantsNextButton(step({ advance: 'auto' }))).toBe(true)
    expect(wantsNextButton(step({ advance: 'manual' }))).toBe(true)
  })

  it('answers to leaving and to a missing target whatever kind of step it is', () => {
    for (const advance of ['click', 'auto', 'manual'] as const) {
      expect(acceptsSignal(step({ advance }), 'quit')).toBe(true)
      expect(acceptsSignal(step({ advance }), 'skip')).toBe(true)
      expect(acceptsSignal(step({ advance }), 'target-missing')).toBe(true)
    }
  })
})

describe('stepAfter: where the tour stands next', () => {
  const steps = [step({ id: 'a', advance: 'click' }), step({ id: 'b' }), step({ id: 'c' })]

  it('moves on when the step answers to the signal', () => {
    expect(stepAfter(steps, 0, 'target-click')).toBe(1)
  })

  it('stays put when it does not, so a stray click is not a step lost', () => {
    expect(stepAfter(steps, 0, 'next-pressed')).toBe(0)
    expect(stepAfter(steps, 0, 'delay-done')).toBe(0)
  })

  it('is over when the last step is done', () => {
    expect(stepAfter(steps, 2, 'next-pressed')).toBeNull()
  })

  it('is over the moment it is skipped or left, wherever it stood', () => {
    expect(stepAfter(steps, 0, 'skip')).toBeNull()
    expect(stepAfter(steps, 1, 'quit')).toBeNull()
  })

  it('passes over a step whose target this build does not have', () => {
    expect(stepAfter(steps, 0, 'target-missing')).toBe(1)
  })

  it('is over rather than stuck when the index is past the end', () => {
    expect(stepAfter(steps, 9, 'next-pressed')).toBeNull()
    expect(stepAfter([], 0, 'next-pressed')).toBeNull()
  })
})

describe('delayFor: how long a timed step runs', () => {
  it('takes the step at its word', () => {
    expect(delayFor(step({ advance: 'auto', delayMs: 900 }))).toBe(900)
  })

  it('falls back to the tour default when the step does not say', () => {
    expect(delayFor(step({ advance: 'auto' }))).toBe(TOUR.autoDelayMs)
  })

  it('gives no clock to a step that waits for a person', () => {
    expect(delayFor(step({ advance: 'manual', delayMs: 900 }))).toBeNull()
    expect(delayFor(step({ advance: 'click' }))).toBeNull()
  })
})

describe('spotlight: the hole cut out of the dark', () => {
  it('opens the hole a little wider than the control itself', () => {
    const hole = spotlight({ top: 100, left: 200, width: 80, height: 40 }, SCREEN, 8)
    expect(hole).toEqual({ top: 92, left: 192, width: 96, height: 56 })
  })

  it('keeps the hole inside the screen when the target hangs off the edge', () => {
    const hole = spotlight({ top: -20, left: -10, width: 80, height: 40 }, SCREEN, 8)
    expect(hole.top).toBe(0)
    expect(hole.left).toBe(0)
    expect(hole.height).toBe(28)
    expect(hole.width).toBe(78)
  })

  it('never cuts a hole of negative size out of a target fully off screen', () => {
    const hole = spotlight({ top: 900, left: 1200, width: 80, height: 40 }, SCREEN, 8)
    expect(hole.width).toBeGreaterThanOrEqual(0)
    expect(hole.height).toBeGreaterThanOrEqual(0)
  })
})

describe('isOnScreen: whether there is anything to point at', () => {
  it('sees a target in view', () => {
    expect(isOnScreen({ top: 10, left: 10, width: 40, height: 20 }, SCREEN)).toBe(true)
  })

  it('does not see one scrolled out of view', () => {
    expect(isOnScreen({ top: -60, left: 10, width: 40, height: 20 }, SCREEN)).toBe(false)
    expect(isOnScreen({ top: 10, left: 1200, width: 40, height: 20 }, SCREEN)).toBe(false)
  })

  it('does not see a collapsed element, which renders but shows nothing', () => {
    expect(isOnScreen({ top: 10, left: 10, width: 0, height: 0 }, SCREEN)).toBe(false)
  })
})

describe('placeTooltip: the card beside the target', () => {
  const target = { top: 400, left: 460, width: 80, height: 40 }

  it('takes the side it was asked for when there is room there', () => {
    const spot = placeTooltip({ target, tooltip: CARD, viewport: SCREEN, placement: 'bottom' })
    expect(spot.placement).toBe('bottom')
    expect(spot.top).toBe(452)
    expect(spot.left).toBe(340)
  })

  it('centres the card on the target along the free axis', () => {
    const spot = placeTooltip({ target, tooltip: CARD, viewport: SCREEN, placement: 'right' })
    expect(spot.placement).toBe('right')
    expect(spot.left).toBe(552)
    expect(spot.top).toBe(340)
  })

  it('flips to the opposite side rather than running off the bottom', () => {
    const low = { top: 740, left: 460, width: 80, height: 40 }
    const spot = placeTooltip({ target: low, tooltip: CARD, viewport: SCREEN, placement: 'bottom' })
    expect(spot.placement).toBe('top')
    expect(spot.top).toBe(568)
  })

  it('flips a side card the other way when the target sits against the left edge', () => {
    const edge = { top: 400, left: 4, width: 80, height: 40 }
    const spot = placeTooltip({ target: edge, tooltip: CARD, viewport: SCREEN, placement: 'left' })
    expect(spot.placement).toBe('right')
    expect(spot.left).toBe(96)
  })

  it('holds the card clear of the edge when centring would push it off', () => {
    const corner = { top: 40, left: 940, width: 40, height: 40 }
    const spot = placeTooltip({
      target: corner,
      tooltip: CARD,
      viewport: SCREEN,
      placement: 'bottom',
      margin: 16,
    })
    expect(spot.left).toBe(664)
    expect(spot.left + CARD.width).toBeLessThanOrEqual(SCREEN.width - 16)
  })

  it('stays on screen wherever the target is', () => {
    const corners = [
      { top: 0, left: 0, width: 40, height: 40 },
      { top: 760, left: 960, width: 40, height: 40 },
      { top: 0, left: 960, width: 40, height: 40 },
      { top: 760, left: 0, width: 40, height: 40 },
    ]
    for (const one of corners) {
      for (const side of ['top', 'bottom', 'left', 'right'] as const) {
        const spot = placeTooltip({
          target: one,
          tooltip: CARD,
          viewport: SCREEN,
          placement: side,
        })
        expect(spot.top).toBeGreaterThanOrEqual(TOUR.edgeMarginPx)
        expect(spot.left).toBeGreaterThanOrEqual(TOUR.edgeMarginPx)
        expect(spot.top + CARD.height).toBeLessThanOrEqual(SCREEN.height - TOUR.edgeMarginPx)
        expect(spot.left + CARD.width).toBeLessThanOrEqual(SCREEN.width - TOUR.edgeMarginPx)
      }
    }
  })

  it('puts a card too big for the screen against the near margin instead of nowhere', () => {
    const huge = { width: 1200, height: 900 }
    const spot = placeTooltip({ target, tooltip: huge, viewport: SCREEN, placement: 'bottom' })
    expect(spot.top).toBe(TOUR.edgeMarginPx)
    expect(spot.left).toBe(TOUR.edgeMarginPx)
  })
})
