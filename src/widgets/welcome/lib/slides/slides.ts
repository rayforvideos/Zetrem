import { msg } from '@lingui/core/macro'
import type { Slide } from './slides.types'

export const SLIDES: Slide[] = [
  {
    key: 'what',
    focus: 'all',
    title: msg`Claude Code, with a screen`,
    body: msg`The CLI does the work. Zetrem shows it as it happens: what you asked for, who is on it, and what they have run.`,
  },
  {
    key: 'talk',
    focus: 'talk',
    title: msg`You talk on the left`,
    body: msg`Ask for the whole job, not the next step. The orchestrator splits it up, hands out the pieces, and replies when they come back.`,
  },
  {
    key: 'crew',
    focus: 'crew',
    title: msg`Your team works on the right`,
    body: msg`Everyone you send out gets a card: their name, their task, and how long they have been at it. Open one to see what they were asked and what they sent back.`,
  },
  {
    key: 'calls',
    focus: 'calls',
    title: msg`Every command is on screen`,
    body: msg`Files read, commands run, edits made. Each one shows up as it happens, not as a summary afterwards.`,
  },
  {
    key: 'hire',
    focus: 'hire',
    title: msg`Teammates are reusable`,
    body: msg`Give them a name, say when to call them, and write their instructions. The orchestrator goes by the "when to call them" line to pick who gets the job.`,
  },
  {
    key: 'keys',
    focus: 'keys',
    title: msg`You decide what runs`,
    body: msg`Choose what can run without asking, check your remaining limits along the bottom, and stop anything while it is running.`,
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
