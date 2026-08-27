import { conversation } from './conversation'

export function advancePermission(
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
