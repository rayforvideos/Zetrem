import { absorbs, resumedAgent, sessionStore } from '@/entities/agent-session'
import type { ClaudeTurnEvent, TranscriptEntry } from '@/entities/agent-session'
import { shapeOfLine } from '@/shared/lib/tool-line/tool-line'
import { resultNote } from '@/shared/lib/tool-shape/tool-shape'
import { clip } from '@/shared/lib/clip/clip'
import type { AgentEventRefs } from '../agent-events.types'
import { t } from '@lingui/core/macro'

const NOTE_MAX = 48

export const SEND_TOOL = 'SendMessage'

export function isCrewEvent(turn: ClaudeTurnEvent): boolean {
  return turn.type.startsWith('child')
}

export function applyCrewEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  switch (turn.type) {
    case 'childOpen':
      refs.childIds.add(turn.toolUseId)
      if (sessionStore.find(turn.toolUseId) !== null) {
        return sessionStore.patch(turn.toolUseId, { status: 'working' })
      }
      return sessionStore.open({
        id: turn.toolUseId,
        runnerId: 'subagent',
        label: turn.label,
        subagentType: turn.subagentType,
        model: 'subagent',
        status: 'working',
        headline: turn.prompt.trim(),
        stream: [],
        transcript: assignment(turn.prompt),
        tokens: 0,
        contextUsed: 0,
        startedAtMs: Date.now(),
        detached: turn.background,
      })
    case 'childStateKnown': {
      const id = whose(turn, refs)
      if (id === null) return
      if (turn.state === 'running' || turn.state === 'pending') return wake(id)
      if (turn.state === 'paused') return
      if (turn.error.length > 0) {
        return sessionStore.patch(id, { status: 'done', headline: `Failed: ${turn.error.trim()}` })
      }
      return sessionStore.patch(id, { status: 'done' })
    }
    case 'childSay':
      if (!refs.childIds.has(turn.toolUseId)) return
      wake(turn.toolUseId)
      sessionStore.patch(turn.toolUseId, { headline: turn.text.trim(), doing: '' })
      return sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
    case 'childStream':
      if (!refs.childIds.has(turn.toolUseId)) return
      wake(turn.toolUseId)
      return sessionStore.beginCall(turn.toolUseId, { id: turn.callId, line: turn.line })
    case 'childCallDone':
      if (!refs.childIds.has(turn.toolUseId)) return
      return closeCall(turn.toolUseId, turn.callId, turn.failed, turn.text)
    case 'childNotified': {
      const id = whose(turn, refs)
      if (id === null) return
      if (turn.summary) sessionStore.patch(id, { headline: turn.summary.trim(), doing: '' })
      return sessionStore.patch(id, { status: turn.done ? 'reported' : 'working' })
    }
    case 'childStarted': {
      const id = whose(turn, refs)
      if (id === null) return
      return sessionStore.patch(id, { taskId: turn.taskId })
    }
    case 'childProgress': {
      const id = whose(turn, refs)
      if (id === null) return
      wake(id)
      note(id, turn.lastTool)
      return sessionStore.patch(id, {
        ...(turn.doing ? { doing: turn.doing.trim() } : {}),
        ...(turn.tokens === null ? {} : { tokens: turn.tokens }),
        lastSeenAtMs: Date.now(),
      })
    }
    case 'childClosed':
      if (!refs.childIds.has(turn.toolUseId)) return
      if (turn.error) {
        return sessionStore.patch(turn.toolUseId, {
          status: 'done',
          headline: `Failed: ${turn.error.trim()}`,
        })
      }
      if (sessionStore.find(turn.toolUseId)?.detached === true) return
      return sessionStore.patch(turn.toolUseId, { status: 'done' })
    default:
      return
  }
}

export function remember(toolUseId: string, input: unknown, refs: AgentEventRefs): void {
  refs.sends.set(toolUseId, addressee(input))
}

export function wakeResumed(toolUseId: string, stdout: string, refs: AgentEventRefs): void {
  const called = refs.sends.get(toolUseId)
  if (called === undefined) return
  refs.sends.delete(toolUseId)
  const agent = resumedAgent(stdout)
  if (agent === null) return
  refs.childIds.add(agent.id)
  if (sessionStore.find(agent.id) !== null) {
    sessionStore.patch(agent.id, { status: 'working' })
    return
  }
  const name = called.length > 0 ? called : agent.name
  sessionStore.open({
    id: agent.id,
    runnerId: 'subagent',
    label: name,
    subagentType: name,
    model: 'subagent',
    status: 'working',
    headline: t`Picked up where they left off`,
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: Date.now(),
  })
}

type Addressed = { toolUseId: string | null; taskId: string }

export function whose(event: Addressed, refs: AgentEventRefs): string | null {
  if (event.toolUseId !== null && refs.childIds.has(event.toolUseId)) return event.toolUseId
  const byTask = sessionStore.findByTask(event.taskId)
  if (byTask !== null && refs.childIds.has(byTask.id)) return byTask.id
  return null
}

function assignment(prompt: string): TranscriptEntry[] {
  const said = prompt.trim()
  return said.length === 0 ? [] : [{ role: 'user', text: said }]
}

export function addressee(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const held = input as Record<string, unknown>
  const to = held.to ?? held.agent ?? held.name
  return typeof to === 'string' ? bareName(to) : ''
}

function bareName(to: string): string {
  return to.replace(/\s*\[[^\]]*\]\s*$/, '').trim()
}

function closeCall(toolUseId: string, callId: string, failed: boolean, text: string): void {
  const call = sessionStore.find(toolUseId)?.stream.findLast((held) => held.id === callId)
  if (call === undefined) return
  const note = failed ? clip(text.trim(), NOTE_MAX) : (resultNote(shapeOfLine(call.line), text) ?? '')
  sessionStore.endCall(toolUseId, callId, { failed, note })
}

function note(toolUseId: string, tool: string): void {
  if (tool.length === 0) return
  const stream = sessionStore.find(toolUseId)?.stream
  if (stream === undefined) return
  const last = stream.at(-1)?.line ?? ''
  if (last === tool || absorbs(tool, last)) return
  const id = `${tool}-${stream.length}`
  sessionStore.beginCall(toolUseId, { id, line: tool })
  sessionStore.endCall(toolUseId, id, { failed: false, note: '' })
}

function wake(toolUseId: string): void {
  const status = sessionStore.find(toolUseId)?.status
  if (status === undefined || status === 'working') return
  sessionStore.patch(toolUseId, { status: 'working', endedAtMs: undefined })
}
