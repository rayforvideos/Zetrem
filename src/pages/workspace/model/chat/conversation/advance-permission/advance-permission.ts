import type { PermissionAsk } from '@/entities/agent-session'
import { changeBadge, changeLines } from '@/entities/tool'
import type { Conversation } from '../conversation.types'

// An ask as it arrives off the CLI: the card's fields, plus the raw tool input
// they were read out of.
type Asked = PermissionAsk & { input: unknown }

// What the card is shown, taken off an ask that also carries the raw input.
// The input stays here: the card decides, it does not call. The diff is cut
// now rather than in the card, so what the person approves and what the report
// shows afterwards are the same reading of the same arguments.
export function askOf(one: Asked): PermissionAsk {
  const change = changeLines(one.toolName, one.input)
  const count = changeBadge(change)
  return {
    requestId: one.requestId,
    toolName: one.toolName,
    line: one.line,
    detail: one.detail,
    ...(one.plan === undefined ? {} : { plan: one.plan }),
    ...(change.length === 0 ? {} : { change }),
    ...(count === null ? {} : { count }),
  }
}

export function advancePermission(conversation: Conversation, asks: readonly Asked[]): void {
  const next = asks[0]
  if (next !== undefined) {
    conversation.setPermission(askOf(next))
    return
  }
  conversation.setPermission(null)
  conversation.setStatus('working')
}
