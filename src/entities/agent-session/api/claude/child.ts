import type { ChildTurnEvent } from './child.types'

import { resultText, toolLine } from './shared'

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
      out.push({
        type: 'childStream',
        toolUseId,
        callId: typeof block.id === 'string' ? block.id : toolLine(block.name, block.input),
        line: toolLine(block.name, block.input),
      })
    }
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      out.push({
        type: 'childCallDone',
        toolUseId,
        callId: block.tool_use_id,
        failed: block.is_error === true,
        text: resultText(block.content),
      })
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

function taskId(event: Record<string, unknown>): string | null {
  return typeof event.task_id === 'string' && event.task_id.length > 0 ? event.task_id : null
}

function toolUseId(event: Record<string, unknown>): string | null {
  return typeof event.tool_use_id === 'string' && event.tool_use_id.length > 0
    ? event.tool_use_id
    : null
}

export function childNotified(event: Record<string, unknown>): ChildTurnEvent[] {
  const task = taskId(event)
  if (task === null) return []
  return [
    {
      type: 'childNotified',
      toolUseId: toolUseId(event),
      taskId: task,
      summary: typeof event.summary === 'string' ? event.summary : '',
      done: event.status === undefined || event.status === 'completed',
    },
  ]
}

export function childStarted(event: Record<string, unknown>): ChildTurnEvent[] {
  const task = taskId(event)
  if (task === null) return []
  return [{ type: 'childStarted', toolUseId: toolUseId(event), taskId: task }]
}

export function childProgress(event: Record<string, unknown>): ChildTurnEvent[] {
  const task = taskId(event)
  if (task === null) return []
  const usage = event.usage as Record<string, unknown> | undefined
  return [
    {
      type: 'childProgress',
      toolUseId: toolUseId(event),
      taskId: task,
      doing: typeof event.description === 'string' ? event.description : '',
      lastTool: typeof event.last_tool_name === 'string' ? event.last_tool_name : '',
      tokens: typeof usage?.total_tokens === 'number' ? usage.total_tokens : 0,
    },
  ]
}

const TASK_STATES = ['pending', 'running', 'completed', 'failed', 'killed', 'paused'] as const

export function childStateKnown(event: Record<string, unknown>): ChildTurnEvent[] {
  const task = taskId(event)
  if (task === null) return []
  const patch = (event.patch ?? {}) as Record<string, unknown>
  const state = TASK_STATES.find((known) => known === patch.status)
  if (state === undefined) return []
  return [
    {
      type: 'childStateKnown',
      toolUseId: toolUseId(event),
      taskId: task,
      state,
      error: typeof patch.error === 'string' ? patch.error : '',
    },
  ]
}
