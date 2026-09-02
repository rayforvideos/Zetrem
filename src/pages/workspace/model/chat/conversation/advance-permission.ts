import type { Conversation } from './conversation.types'

export function advancePermission(
  conversation: Conversation,
  asks: readonly { requestId: string; toolName: string; line: string; detail: string }[],
): void {
  const next = asks[0]
  if (next !== undefined) {
    conversation.setPermission({
      requestId: next.requestId,
      toolName: next.toolName,
      line: next.line,
      detail: next.detail,
    })
    return
  }
  conversation.setPermission(null)
  conversation.setStatus('working')
}
