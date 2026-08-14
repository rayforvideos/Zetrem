import { resultText, toolLine } from './shared'

export type ChildTurnEvent =
  | {
      type: 'childOpen'
      toolUseId: string
      label: string
      subagentType: string
      prompt: string
      background: boolean
    }
  | { type: 'childSay'; toolUseId: string; role: 'user' | 'assistant'; text: string }
  | { type: 'childStream'; toolUseId: string; line: string }
  | { type: 'childClosed'; toolUseId: string; error?: string }
  | { type: 'childNotified'; toolUseId: string; summary: string }

export function childSays(
  event: Record<string, unknown>,
  toolUseId: string,
  role: 'user' | 'assistant',
): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      out.push({ type: 'childSay', toolUseId, role, text: block.text })
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      out.push({ type: 'childStream', toolUseId, line: toolLine(block.name, block.input) })
    }
  }
  return out
}

export function childCloses(event: Record<string, unknown>): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      const error =
        block.is_error === true ? resultText(block.content) : undefined
      out.push(
        error !== undefined
          ? { type: 'childClosed', toolUseId: block.tool_use_id, error }
          : { type: 'childClosed', toolUseId: block.tool_use_id },
      )
    }
  }
  return out
}

export function childNotified(event: Record<string, unknown>): ChildTurnEvent[] {
  if (typeof event.tool_use_id !== 'string') return []
  return [
    {
      type: 'childNotified',
      toolUseId: event.tool_use_id,
      summary: typeof event.summary === 'string' ? event.summary : '',
    },
  ]
}
