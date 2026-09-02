import type { ChildTurnEvent, Task } from './child.types'

import { blocksIn, resultText, str, toolLine } from '../shared/shared'
import { childLabel } from '../turn/turn'

const TASK_STATES = ['pending', 'running', 'completed', 'failed', 'killed', 'paused'] as const

export function childSays(
  event: Record<string, unknown>,
  toolUseId: string,
  role: 'user' | 'assistant',
): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of blocksIn(content)) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
      out.push({ type: 'childSay', toolUseId, role, text: block.text })
    }
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      const callId = typeof block.id === 'string' ? block.id : toolLine(block.name, block.input)
      if ((block.name === 'Agent' || block.name === 'Task') && typeof block.id === 'string') {
        const input = block.input as Record<string, unknown> | undefined
        out.push({
          type: 'childOpen',
          toolUseId: block.id,
          label: childLabel(block),
          subagentType: typeof input?.subagent_type === 'string' ? input.subagent_type : '',
          prompt: str(input?.prompt),
          background: input?.run_in_background === true,
          parentId: toolUseId,
        })
      }
      out.push({
        type: 'childStream',
        toolUseId,
        callId,
        line: toolLine(block.name, block.input),
        input: block.input ?? null,
      })
      const sent = crewTalk(block)
      if (sent !== null) out.push({ type: 'childSent', toolUseId, callId, ...sent })
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

// SendMessage addresses an agent by the id the CLI gave it, the same string as its task id.
function crewTalk(block: Record<string, unknown>): { to: string; message: string } | null {
  if (block.name !== 'SendMessage') return null
  const input = block.input as Record<string, unknown> | undefined
  const to = str(input?.to).trim()
  const message = str(input?.message)
  return to.length === 0 ? null : { to, message }
}

export function childCloses(event: Record<string, unknown>): ChildTurnEvent[] {
  const content = (event.message as Record<string, unknown> | undefined)?.content
  if (!Array.isArray(content)) return []
  const out: ChildTurnEvent[] = []
  for (const block of blocksIn(content)) {
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
      out.push({
        type: 'childClosed',
        toolUseId: block.tool_use_id,
        ...(block.is_error === true ? { error: resultText(block.content) } : {}),
      })
    }
  }
  return out
}

function taskEvent(
  event: Record<string, unknown>,
  body: (task: Task, event: Record<string, unknown>) => ChildTurnEvent | null,
): ChildTurnEvent[] {
  const taskId = str(event.task_id)
  if (taskId.length === 0) return []
  const toolUseId = str(event.tool_use_id)
  const made = body({ toolUseId: toolUseId.length > 0 ? toolUseId : null, taskId }, event)
  return made === null ? [] : [made]
}

export function childNotified(event: Record<string, unknown>): ChildTurnEvent[] {
  return taskEvent(event, (task) => ({
    type: 'childNotified',
    ...task,
    summary: str(event.summary),
    done: event.status === undefined || event.status === 'completed',
  }))
}

export function childStarted(event: Record<string, unknown>): ChildTurnEvent[] {
  return taskEvent(event, (task) => ({
    type: 'childStarted',
    ...task,
    taskType: str(event.task_type),
    description: str(event.description).trim(),
  }))
}

export function childProgress(event: Record<string, unknown>): ChildTurnEvent[] {
  return taskEvent(event, (task) => {
    const usage = event.usage as Record<string, unknown> | undefined
    return {
      type: 'childProgress',
      ...task,
      doing: str(event.description),
      lastTool: str(event.last_tool_name),
      tokens: typeof usage?.total_tokens === 'number' ? usage.total_tokens : null,
    }
  })
}

export function childStateKnown(event: Record<string, unknown>): ChildTurnEvent[] {
  return taskEvent(event, (task) => {
    const patch = (event.patch ?? {}) as Record<string, unknown>
    const state = TASK_STATES.find((known) => known === patch.status)
    if (state === undefined) return null
    return { type: 'childStateKnown', ...task, state, error: str(patch.error) }
  })
}
