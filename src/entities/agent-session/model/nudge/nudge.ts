import type { Nudge, NudgeAt } from './nudge.types'

export function nudgeFor(at: NudgeAt): Nudge | null {
  if (!at.wanted || at.watching) return null
  if (at.reason === 'permission') {
    return {
      reason: 'permission',
      title: 'Zetrem needs you',
      body: at.tool.length > 0 ? `Waiting to run ${at.tool}` : 'Waiting for your approval',
    }
  }
  return { reason: 'done', title: 'Zetrem is done', body: 'Your team has finished.' }
}
