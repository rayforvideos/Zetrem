import { t } from '@lingui/core/macro'
import type { Nudge, NudgeAt } from './nudge.types'

export function nudgeFor(at: NudgeAt): Nudge | null {
  if (!at.wanted || at.watching) return null
  if (at.reason === 'permission') {
    return {
      reason: 'permission',
      title: t`Zetrem needs you`,
      body: at.tool.length > 0 ? t`Waiting to run ${at.tool}` : t`Waiting for your approval`,
    }
  }
  return { reason: 'done', title: t`Zetrem is done`, body: t`Your team has finished.` }
}
