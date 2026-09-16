import type { CharacterId } from '@/entities/teammate'

// How a step hands over to the next one. A click step waits for the reviewer
// to touch the real control, which is the whole point of a demo that runs the
// actual UI; an auto step moves on by itself; a manual step waits for the
// button.
export type TourAdvance = 'click' | 'auto' | 'manual'

// The side of the target the card is asked for. It is a preference only: near
// an edge the card takes the opposite side instead.
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right'

// One stop on the tour. `target` is a CSS selector for the element the
// spotlight cuts out; null puts the card in the middle of the screen, which is
// what an opening or a closing word wants.
export type TourStep = {
  id: string
  target: string | null
  // What must be on screen before the step says anything. A target is often
  // there before the thing the step is about is finished: one teammate of
  // three has arrived, an answer is still being written. Naming the finished
  // state here keeps the card from speaking too early.
  waitFor?: string
  // What must be off the screen before the step says anything. The panel a run
  // works under stays a few seconds past the answer and the conversation
  // widens the moment it goes: a card placed before that slides out from under
  // the reader.
  waitGone?: string
  // The control that answers a click step, when only part of what is lit
  // counts as an answer. A permission card is one box, but only allowing it
  // carries the recording on: turning it down leaves the step where it was.
  advanceOn?: string
  // Who is saying it. One of the faces the app gives teammates, so the walk is
  // spoken by somebody rather than printed by the page.
  face?: CharacterId
  title: string
  body: string
  advance: TourAdvance
  delayMs?: number
  placement?: TourPlacement
}

// A rectangle in viewport coordinates, the part of getBoundingClientRect the
// placing needs, kept plain so the arithmetic can be tested without a DOM.
export type Box = { top: number; left: number; width: number; height: number }

export type Size = { width: number; height: number }

// Where the card ended up, and which side it actually took. The side is worth
// reporting because the little arrow and the reading order follow it.
export type TooltipSpot = { top: number; left: number; placement: TourPlacement }

export type PlaceRequest = {
  target: Box
  tooltip: Size
  viewport: Size
  placement?: TourPlacement
  // Distance kept between the target and the card.
  gap?: number
  // Distance kept between the card and the edge of the screen.
  margin?: number
}

// What just happened, in the tour's own words. The step decides which of these
// it answers to, so one reducer covers every kind of step.
export type TourSignal =
  | 'target-click'
  | 'delay-done'
  | 'next-pressed'
  | 'target-missing'
  | 'skip'
  | 'quit'

// Why the tour is over: it ran out of steps, the reviewer skipped it, or Esc
// closed it. The three are worth telling apart when the run is measured.
export type TourEnd = 'finished' | 'skipped' | 'quit'

export type TourProps = {
  steps: TourStep[]
  onDone(reason: TourEnd): void
  // Called as each step opens, so a replay can be moved along with the tour.
  onStepChange?(step: TourStep, at: number): void
  // How long a step waits for a target that has not rendered yet.
  waitMs?: number
}
