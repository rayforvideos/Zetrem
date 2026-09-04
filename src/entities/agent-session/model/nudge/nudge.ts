import { t } from '@lingui/core/macro'
import type { Nudge, NudgeAt } from './nudge.types'

// A question is the one thing a notice quotes back. Everything else the app
// says about itself it can say in its own words, but "needs you" without the
// question is a notice nobody can weigh from where they are standing.
const SAID_MAX = 80

export function nudgeFor(at: NudgeAt): Nudge | null {
  if (!at.wanted || at.watching) return null
  if (at.reason === 'done' && at.asked === true) return null
  if (at.reason === 'question') {
    return {
      reason: 'question',
      title: heading(at.again === true),
      body: excerpt(at.said ?? '') || t`Waiting for your answer`,
    }
  }
  if (at.reason === 'permission') {
    return {
      reason: 'permission',
      title: heading(at.again === true),
      body: at.tool.length > 0 ? t`Waiting to run ${at.tool}` : t`Waiting for your approval`,
    }
  }
  if (at.trouble === true) {
    return {
      reason: 'done',
      title: t`Zetrem hit a problem`,
      body: t`A session stopped with an error.`,
    }
  }
  return { reason: 'done', title: t`Zetrem is done`, body: t`Your team has finished.` }
}

function heading(again: boolean): string {
  return again ? t`Zetrem is still waiting` : t`Zetrem needs you`
}

function excerpt(said: string): string {
  const line = said.replace(/\s+/g, ' ').trim()
  if (line.length <= SAID_MAX) return line
  return `${line.slice(0, SAID_MAX - 1).trimEnd()}…`
}
