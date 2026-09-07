import { t } from '@lingui/core/macro'
import type { ExitReason } from './exit-line.types'

export function exitLine(reason: ExitReason): string {
  if (reason.code === 'cli-missing') {
    return t`The claude command was not found. Install the Claude Code CLI, then try again.`
  }
  // The CLI's own last word, with how it ended after it: the words alone never
  // said whether it chose to stop or was cut down mid-sentence.
  if (reason.code === 'cli-said') {
    return reason.ended.length === 0 ? reason.said : `${reason.said} (${reason.ended})`
  }
  if (reason.code === 'died') {
    const ended = reason.ended
    return t`Claude Code stopped without a word (${ended}). Your next message picks the conversation back up.`
  }
  if (reason.code === 'signalled') {
    const signal = reason.said
    return t`Claude Code was ended from outside (${signal}). Your next message picks the conversation back up.`
  }
  if (reason.said.length === 0) return t`Could not start Claude Code`
  const said = reason.said
  return t`Could not start Claude Code: ${said}`
}
