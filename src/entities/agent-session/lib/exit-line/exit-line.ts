import { t } from '@lingui/core/macro'
import type { ExitReason } from './exit-line.types'

export function exitLine(reason: ExitReason): string {
  if (reason.code === 'cli-missing') {
    return t`The claude command was not found. Install the Claude Code CLI, then try again.`
  }
  if (reason.code === 'cli-said') return reason.said
  if (reason.said.length === 0) return t`Could not start Claude Code`
  const said = reason.said
  return t`Could not start Claude Code: ${said}`
}
