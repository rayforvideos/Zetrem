import { conversation } from './conversation'

// The two owners of the ask queue (deciding in use-agent, dropping in
// agent-events) must show the same next ask the same way; keeping this in
// one place is what stops them drifting. Status flips to working only when
// the queue empties: a queued ask keeps its waiting state.
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
