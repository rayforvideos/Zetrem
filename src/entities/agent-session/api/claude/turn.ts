import type { TurnEvent } from './turn.types'

import type { ChildTurnEvent } from './child.types'
import { resultText, toolLine } from './shared'

export function fromAssistant(event: Record<string, unknown>): TurnEvent[] {
  const message = event.message as Record<string, unknown> | undefined
  const content = message?.content
  if (!Array.isArray(content)) return []

  const out: TurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      out.push({ type: 'headline', text: block.text })
    }
    if (block.type === 'thinking' && typeof block.thinking === 'string' && block.thinking.length > 0) {
      out.push({ type: 'thinking', text: block.thinking })
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      out.push({
        type: 'stream',
        line: toolLine(block.name, block.input),
        toolUseId: typeof block.id === 'string' ? block.id : null,
        input: block.input,
      })
      if ((block.name === 'Agent' || block.name === 'Task') && typeof block.id === 'string') {
        const input = block.input as Record<string, unknown> | undefined
        out.push({
          type: 'childOpen',
          toolUseId: block.id,
          label: childLabel(block),
          subagentType: typeof input?.subagent_type === 'string' ? input.subagent_type : '',
          prompt: typeof input?.prompt === 'string' ? input.prompt : '',
          background: input?.run_in_background === true,
        })
      }
    }
  }
  return out
}

function childLabel(block: Record<string, unknown>): string {
  const input = block.input as Record<string, unknown> | undefined
  if (typeof input?.description === 'string' && input.description.length > 0)
    return input.description
  if (typeof input?.subagent_type === 'string' && input.subagent_type.length > 0)
    return input.subagent_type
  return typeof block.name === 'string' ? block.name : 'subagent'
}

export function fromStreamEvent(event: Record<string, unknown>): TurnEvent[] {
  if (typeof event.parent_tool_use_id === 'string') return []
  const inner = event.event as Record<string, unknown> | undefined
  if (inner?.type !== 'content_block_delta') return []
  const delta = inner.delta as Record<string, unknown> | undefined
  if (delta?.type !== 'text_delta' || typeof delta.text !== 'string') return []
  return [{ type: 'delta', text: delta.text }]
}

export function fromResult(event: Record<string, unknown>): TurnEvent[] {
  const out: TurnEvent[] = []
  const denials = event.permission_denials
  if (Array.isArray(denials)) {
    for (const denial of denials as Record<string, unknown>[]) {
      const tool = typeof denial.tool_name === 'string' ? denial.tool_name : 'tool'
      out.push({ type: 'stream', line: `permission denied: ${tool}`, toolUseId: null, input: null })
    }
  }
  out.push({ type: 'turnEnded' })
  return out
}

export function fromToolResult(event: Record<string, unknown>): TurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const detail = event.tool_use_result as Record<string, unknown> | undefined
  const out: TurnEvent[] = []
  for (const block of content as Record<string, unknown>[]) {
    if (block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') continue
    out.push({
      type: 'toolResult',
      toolUseId: block.tool_use_id,
      stdout: typeof detail?.stdout === 'string' ? detail.stdout : resultText(block.content),
      stderr: typeof detail?.stderr === 'string' ? detail.stderr : '',
      isError: block.is_error === true,
      interrupted: detail?.interrupted === true,
    })
  }
  return out
}
