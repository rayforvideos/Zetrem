import type { PermissionAsk } from '@/entities/agent-session'
import type { Conversation } from './conversation.types'

// What the card is shown, taken off an ask that also carries the raw input.
// The input stays here: the card decides, it does not call.
export function askOf(one: PermissionAsk): PermissionAsk {
  return {
    requestId: one.requestId,
    toolName: one.toolName,
    line: one.line,
    detail: one.detail,
    ...(one.plan === undefined ? {} : { plan: one.plan }),
  }
}

export function advancePermission(
  conversation: Conversation,
  asks: readonly PermissionAsk[],
): void {
  const next = asks[0]
  if (next !== undefined) {
    conversation.setPermission(askOf(next))
    return
  }
  conversation.setPermission(null)
  conversation.setStatus('working')
}
