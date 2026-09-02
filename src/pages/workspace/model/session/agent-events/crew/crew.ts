import { sessionStore } from '@/entities/agent-session'
import { wake } from './wake'
import { forgetOwnedBash, ownsRunningBash } from './crew-bash'
export { adoptChildBash, releaseChildBash } from './crew-bash'
import { addressee, whose } from './addressee'
import { absorbs, resumedAgent } from '@/entities/claude-cli'
import type { AgentSession, TranscriptEntry } from '@/entities/agent-session'
import type { ClaudeTurnEvent } from '@/entities/claude-cli'
import { changeBadge, changeLines, resultNote, shapeOfLine, toolNameOf } from '@/entities/tool'
import { clip } from '@/pages/workspace/model/session/agent-events/clip/clip'
import type { AgentEventRefs } from '../agent-events.types'
import { t } from '@lingui/core/macro'

const NOTE_MAX = 48

export const SEND_TOOL = 'SendMessage'

export function isCrewEvent(turn: ClaudeTurnEvent): boolean {
  return turn.type.startsWith('child')
}

export function applyCrewEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  switch (turn.type) {
    case 'childOpen': {
      // A grandchild named under a parent we never opened has nothing to hang
      // off. Seating it anyway would put it on the board as a teammate of its
      // own, which is exactly what a helper is not, so it is let go.
      if (turn.parentId !== undefined && !refs.childIds.has(turn.parentId)) return
      refs.childIds.add(turn.toolUseId)
      // The CLI can register the task before the tool_use block streams in, so
      // the id it announced early is claimed here or the child reads untracked.
      const early = pendingTasks.get(turn.toolUseId)
      pendingTasks.delete(turn.toolUseId)
      if (sessionStore.find(turn.toolUseId) !== null) {
        sessionStore.patch(turn.toolUseId, {
          status: 'working',
          ...(early === undefined ? {} : { taskId: early }),
        })
        return
      }
      sessionStore.open({
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
        ...(early === undefined ? {} : { taskId: early }),
        ...(turn.parentId === undefined ? {} : { parentId: turn.parentId }),
      })
      return
    }
    case 'childStateKnown': {
      const id = whose(turn, refs)
      if (id === null) return
      // completed also fires when an agent merely idles waiting on its own
      // backgrounded shell, so that case stays working rather than closing.
      if (turn.state === 'running' || turn.state === 'pending') {
        wake(id)
        return
      }
      if (turn.state === 'paused') return
      if (turn.error.length > 0) {
        sessionStore.patch(id, { status: 'done', headline: `Failed: ${turn.error.trim()}` })
        return
      }
      if (turn.state === 'completed' && ownsRunningBash(id)) {
        wake(id)
        return
      }
      sessionStore.patch(id, { status: 'done' })
      return
    }
    case 'childSay':
      if (!refs.childIds.has(turn.toolUseId)) return
      if (!closedForGood(turn.toolUseId)) wake(turn.toolUseId)
      sessionStore.patch(turn.toolUseId, { headline: turn.text.trim(), doing: '' })
      sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
      return
    case 'childStream': {
      if (!refs.childIds.has(turn.toolUseId) || closedForGood(turn.toolUseId)) return
      wake(turn.toolUseId)
      // The differ runs here, once, and the raw input is let go: what is stored
      // is the change itself, so no view has to hold a whole file to draw it.
      const change = changeLines(toolNameOf(turn.line), turn.input)
      const count = changeBadge(change)
      sessionStore.beginCall(turn.toolUseId, {
        id: turn.callId,
        line: turn.line,
        ...(change.length === 0 ? {} : { change }),
        ...(count === null ? {} : { count }),
      })
      return
    }
    case 'childSent': {
      if (!refs.childIds.has(turn.toolUseId)) return
      const heard = sessionStore.findByTask(turn.to)
      if (heard === null || heard.id === turn.toolUseId) return
      const said = turn.message.trim()
      const teller = sessionStore.find(turn.toolUseId)?.label ?? ''
      if (said.length > 0) {
        sessionStore.appendTranscript(heard.id, { role: 'user', text: said, from: teller })
      }
      return
    }
    case 'childCallDone':
      if (!refs.childIds.has(turn.toolUseId)) return
      closeCall(turn.toolUseId, turn.callId, turn.failed, turn.text)
      return
    case 'childNotified': {
      const id = whose(turn, refs)
      if (id === null) return
      if (turn.summary) sessionStore.patch(id, { headline: turn.summary.trim(), doing: '' })
      if (closedForGood(id)) return
      // Done while the agent's own shell still runs would let the silence rule
      // close its tile mid-job.
      const parked = turn.done && !ownsRunningBash(id)
      sessionStore.patch(id, { status: parked ? 'reported' : 'working' })
      return
    }
    case 'childStarted': {
      const id = whose(turn, refs)
      if (id === null) {
        if (turn.toolUseId !== null) pendingTasks.set(turn.toolUseId, turn.taskId)
        return
      }
      wake(id)
      sessionStore.patch(id, { taskId: turn.taskId })
      return
    }
    case 'childProgress': {
      const id = whose(turn, refs)
      if (id === null || closedForGood(id)) return
      wake(id)
      note(id, turn.lastTool)
      sessionStore.patch(id, {
        ...(turn.doing ? { doing: turn.doing.trim() } : {}),
        ...(turn.tokens === null ? {} : { tokens: turn.tokens }),
        lastSeenAtMs: Date.now(),
      })
      return
    }
    case 'childClosed': {
      if (!refs.childIds.has(turn.toolUseId)) return
      if (turn.error) {
        sessionStore.patch(turn.toolUseId, {
          status: 'done',
          headline: `Failed: ${turn.error.trim()}`,
        })
        return
      }
      // The CLI hands the Task tool_result back while the child is still running
      // and reports its real end through task events.
      const held = sessionStore.find(turn.toolUseId)
      if (held?.detached === true || (held?.taskId ?? '').length > 0) return
      sessionStore.patch(turn.toolUseId, { status: 'done' })
      return
    }
    default:
      return
  }
}

export function remember(toolUseId: string, input: unknown, refs: AgentEventRefs): void {
  const held = input as Record<string, unknown> | null
  const message = typeof held?.message === 'string' ? held.message : ''
  const to = addressee(input)
  refs.sends.set(toolUseId, { to, message })
  const heard = seatOf(to)
  if (heard === null) return
  const said = message.trim()
  if (said.length > 0) {
    sessionStore.appendTranscript(heard.id, { role: 'user', text: said, from: t`the orchestrator` })
  }
}

function seatOf(to: string): AgentSession | null {
  if (to.length === 0) return null
  return sessionStore.findByTask(to) ?? sessionStore.find(to)
}

export function wakeResumed(toolUseId: string, stdout: string, refs: AgentEventRefs): void {
  const called = refs.sends.get(toolUseId)
  if (called === undefined) return
  refs.sends.delete(toolUseId)
  const agent = resumedAgent(stdout)
  if (agent === null) return
  const held = seatOf(agent.id) ?? seatOf(called.to)
  if (held !== null) {
    refs.childIds.add(held.id)
    sessionStore.patch(held.id, { status: 'working' })
    return
  }
  refs.childIds.add(agent.id)
  const name = called.to.length > 0 ? called.to : agent.name
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

function assignment(prompt: string): TranscriptEntry[] {
  const said = prompt.trim()
  return said.length === 0 ? [] : [{ role: 'user', text: said, atMs: Date.now() }]
}

function closeCall(toolUseId: string, callId: string, failed: boolean, text: string): void {
  const call = sessionStore.find(toolUseId)?.stream.findLast((held) => held.id === callId)
  if (call === undefined) return
  const note = failed
    ? clip(text.trim(), NOTE_MAX)
    : (resultNote(shapeOfLine(call.line), text) ?? '')
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

// An owner whose shell is never released swallows every completed that
// follows, and its tile never closes.
export function forgetCrew(): void {
  forgetOwnedBash()
  pendingTasks.clear()
}

const pendingTasks = new Map<string, string>()

// Done plus a task id means the CLI itself said this child ended. Without a
// task id, done may be our own silence guess, which progress may still undo.
function closedForGood(id: string): boolean {
  const held = sessionStore.find(id)
  return held?.status === 'done' && (held.taskId ?? '').length > 0
}
