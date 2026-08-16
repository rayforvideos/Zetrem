import type { Slide } from './slides.types'

export const SLIDES: Slide[] = [
  {
    key: 'what',
    focus: 'all',
    title: 'Claude Code, given a screen',
    body: 'The CLI does the work. Zetrem shows it while it happens: what was asked, who is on it, and what they have run so far.',
  },
  {
    key: 'talk',
    focus: 'talk',
    title: 'You talk on the left',
    body: 'Ask for the whole job, not the next step. The orchestrator plans it, hands pieces out, and answers you when the pieces come back.',
  },
  {
    key: 'crew',
    focus: 'crew',
    title: 'Your team works on the right',
    body: 'Everyone you send out gets a card with their name, their task and their clock. Press one to read what they were asked and what they wrote back.',
  },
  {
    key: 'calls',
    focus: 'calls',
    title: 'Every command is on screen',
    body: 'Each file read, each command run, each edit made, as it happens. Nothing is summarised after the fact.',
  },
  {
    key: 'hire',
    focus: 'hire',
    title: 'A teammate is a brief you write once',
    body: 'Name them, say when they should be called, and write their standing instructions. The orchestrator reads that middle line to decide who gets the job.',
  },
  {
    key: 'keys',
    focus: 'keys',
    title: 'You keep the keys',
    body: 'Decide what may run without asking, watch what is left of your limits along the foot, and stop anything mid-flight.',
  },
]

export function stepTo(at: number, by: number): number {
  const next = at + by
  if (next < 0) return 0
  if (next > SLIDES.length - 1) return SLIDES.length - 1
  return next
}

export function lastSlide(at: number): boolean {
  return at >= SLIDES.length - 1
}
