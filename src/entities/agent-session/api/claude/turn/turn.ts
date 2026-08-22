import { t } from '@lingui/core/macro'
import { modelRefusedIn } from '../../../model/refused/refused'
import type { TurnEvent } from './turn.types'

import { retryLine, stoppedLine } from '../failure/failure'
import { resultText, toolLine } from '../shared/shared'

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
      const tool = typeof denial.tool_name === 'string' ? denial.tool_name : t`tool`
      out.push({ type: 'notice', text: t`${tool} was not allowed` })
    }
  }
  const said = stoppedLine({
    subtype: str(event.subtype),
    isError: event.is_error === true,
    error: str(event.error),
    result: str(event.result),
    errors: event.errors,
  })
  if (said !== null) {
    // Read the model off what the CLI wrote, not off `said`: stoppedLine has
    // already rewritten it for the screen and dropped the name.
    const refused = modelRefusedIn(str(event.result))
    out.push(refused === null ? { type: 'notice', text: said } : { type: 'notice', text: said, refused })
  }
  out.push({ type: 'turnEnded' })
  return out
}

export function fromStartupTrouble(event: Record<string, unknown>): TurnEvent[] {
  return [
    ...troubles(event.mcp_server_errors, t`MCP server`),
    ...troubles(event.plugin_errors, t`Plugin`),
  ]
}

function troubles(raw: unknown, kind: string): TurnEvent[] {
  if (!Array.isArray(raw)) return []
  const out: TurnEvent[] = []
  for (const entry of raw as Record<string, unknown>[]) {
    const name = str(entry.name) || str(entry.plugin) || 'one'
    const why = str(entry.message) || str(entry.type) || t`it could not be loaded`
    out.push({ type: 'notice', text: t`${kind} ${name} did not load: ${why}` })
  }
  return out
}

export function fromRetry(event: Record<string, unknown>): TurnEvent[] {
  return [
    {
      type: 'notice',
      text: retryLine(
        num(event.attempt, 1),
        num(event.max_retries, 0),
        num(event.retry_delay_ms, 0),
        str(event.error),
        typeof event.error_status === 'number' ? event.error_status : null,
      ),
    },
  ]
}


function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
