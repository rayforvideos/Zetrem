import { plural, t } from '@lingui/core/macro'
import type { WorkOutcome } from '@/entities/agent-session'

export function leftBehind(outcome: WorkOutcome): string {
  const parts: string[] = []
  if (outcome.commits > 0) {
    parts.push(plural(outcome.commits, { one: '# commit', other: '# commits' }))
  }
  if (outcome.dirtyFiles > 0) {
    parts.push(
      plural(outcome.dirtyFiles, { one: '# file not committed', other: '# files not committed' }),
    )
  }
  const branch = outcome.branch
  if (parts.length === 0) return t`Left nothing on ${branch}`
  const what = parts.join(t` and `)
  return t`Left ${what} on ${branch}`
}
