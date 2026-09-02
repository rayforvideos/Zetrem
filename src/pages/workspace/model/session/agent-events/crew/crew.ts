import { wake } from './wake'
import { ownsRunningBash } from './crew-bash'
export { adoptChildBash, releaseChildBash } from './crew-bash'
import { addressee, whose } from './addressee'
import { absorbs, resumedAgent } from '@/entities/claude-cli'
import type { AgentSession, SessionStore, TranscriptEntry } from '@/entities/agent-session'
import type { ClaudeTurnEvent } from '@/entities/claude-cli'
import { shapeOfLine } from '@/entities/tool'
import { resultNote } from '@/entities/tool'
import { clip } from '@/pages/workspace/model/session/agent-events/clip/clip'
import type { AgentEventRefs } from '../agent-events.types'
import { t } from '@lingui/core/macro'

const NOTE_MAX = 48

export const SEND_TOOL = 'SendMessage'

export function isCrewEvent(turn: ClaudeTurnEvent): boolean {
  return turn.type.startsWith('child')
}

export function applyCrewEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  const children = refs.stores.children
  switch (turn.type) {
    case 'childOpen': {
      refs.childIds.add(turn.toolUseId)
      // The CLI can register the task before the tool_use block streams in, so
      // the id it announced early is claimed here or the child reads untracked.
      const early = refs.pendingTasks.get(turn.toolUseId)
      refs.pendingTasks.delete(turn.toolUseId)
      if (children.find(turn.toolUseId) !== null) {
        children.patch(turn.toolUseId, {
          status: 'working',
          ...(early === undefined ? {} : { taskId: early }),
        })
        return
      }
      children.open({
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
      })
      return
    }
    case 'childStateKnown': {
      const id = whose(turn, refs)
      if (id === null) return
      // completed also fires when an agent merely idles waiting on its own
      // backgrounded shell, so that case stays working rather than closing.
      if (turn.state === 'running' || turn.state === 'pending') {
        wake(children, id)
        return
      }
      if (turn.state === 'paused') return
      if (turn.error.length > 0) {
        children.patch(id, { status: 'done', headline: `Failed: ${turn.error.trim()}` })
        return
      }
      if (turn.state === 'completed' && ownsRunningBash(refs, id)) {
        wake(children, id)
        return
      }
      children.patch(id, { status: 'done' })
      return
    }
    case 'childSay':
      if (!refs.childIds.has(turn.toolUseId)) return
      if (!closedForGood(children, turn.toolUseId)) wake(children, turn.toolUseId)
      children.patch(turn.toolUseId, { headline: turn.text.trim(), doing: '' })
      children.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
      return
    case 'childStream':
      if (!refs.childIds.has(turn.toolUseId) || closedForGood(children, turn.toolUseId)) return
      wake(children, turn.toolUseId)
      children.beginCall(turn.toolUseId, { id: turn.callId, line: turn.line })
      return
    case 'childSent': {
      if (!refs.childIds.has(turn.toolUseId)) return
      const heard = children.findByTask(turn.to)
      if (heard === null || heard.id === turn.toolUseId) return
      const said = turn.message.trim()
      const teller = children.find(turn.toolUseId)?.label ?? ''
      if (said.length > 0) {
        children.appendTranscript(heard.id, { role: 'user', text: said, from: teller })
      }
      return
    }
    case 'childCallDone':
      if (!refs.childIds.has(turn.toolUseId)) return
      closeCall(children, turn.toolUseId, turn.callId, turn.failed, turn.text)
      return
    case 'childNotified': {
      const id = whose(turn, refs)
      if (id === null) return
      if (turn.summary) children.patch(id, { headline: turn.summary.trim(), doing: '' })
      if (closedForGood(children, id)) return
      // Done while the agent's own shell still runs would let the silence rule
      // close its tile mid-job.
      const parked = turn.done && !ownsRunningBash(refs, id)
      children.patch(id, { status: parked ? 'reported' : 'working' })
      return
    }
    case 'childStarted': {
      const id = whose(turn, refs)
      if (id === null) {
        if (turn.toolUseId !== null) refs.pendingTasks.set(turn.toolUseId, turn.taskId)
        return
      }
      wake(children, id)
      children.patch(id, { taskId: turn.taskId })
      return
    }
    case 'childProgress': {
      const id = whose(turn, refs)
      if (id === null || closedForGood(children, id)) return
      wake(children, id)
      note(children, id, turn.lastTool)
      children.patch(id, {
        ...(turn.doing ? { doing: turn.doing.trim() } : {}),
        ...(turn.tokens === null ? {} : { tokens: turn.tokens }),
        lastSeenAtMs: Date.now(),
      })
      return
    }
    case 'childClosed': {
      if (!refs.childIds.has(turn.toolUseId)) return
      if (turn.error) {
        children.patch(turn.toolUseId, {
          status: 'done',
          headline: `Failed: ${turn.error.trim()}`,
        })
        return
      }
      // The CLI hands the Task tool_result back while the child is still running
      // and reports its real end through task events.
      const held = children.find(turn.toolUseId)
      if (held?.detached === true || (held?.taskId ?? '').length > 0) return
      children.patch(turn.toolUseId, { status: 'done' })
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
  const heard = seatOf(refs.stores.children, to)
  if (heard === null) return
  const said = message.trim()
  if (said.length > 0) {
    refs.stores.children.appendTranscript(heard.id, {
      role: 'user',
      text: said,
      from: t`the orchestrator`,
    })
  }
}

function seatOf(children: SessionStore, to: string): AgentSession | null {
  if (to.length === 0) return null
  return children.findByTask(to) ?? children.find(to)
}

export function wakeResumed(toolUseId: string, stdout: string, refs: AgentEventRefs): void {
  const called = refs.sends.get(toolUseId)
  if (called === undefined) return
  refs.sends.delete(toolUseId)
  const agent = resumedAgent(stdout)
  if (agent === null) return
  const children = refs.stores.children
  const held = seatOf(children, agent.id) ?? seatOf(children, called.to)
  if (held !== null) {
    refs.childIds.add(held.id)
    children.patch(held.id, { status: 'working' })
    return
  }
  refs.childIds.add(agent.id)
  const name = called.to.length > 0 ? called.to : agent.name
  children.open({
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
  return said.length === 0 ? [] : [{ role: 'user', text: said }]
}

function closeCall(
  children: SessionStore,
  toolUseId: string,
  callId: string,
  failed: boolean,
  text: string,
): void {
  const call = children.find(toolUseId)?.stream.findLast((held) => held.id === callId)
  if (call === undefined) return
  const note = failed
    ? clip(text.trim(), NOTE_MAX)
    : (resultNote(shapeOfLine(call.line), text) ?? '')
  children.endCall(toolUseId, callId, { failed, note })
}

function note(children: SessionStore, toolUseId: string, tool: string): void {
  if (tool.length === 0) return
  const stream = children.find(toolUseId)?.stream
  if (stream === undefined) return
  const last = stream.at(-1)?.line ?? ''
  if (last === tool || absorbs(tool, last)) return
  const id = `${tool}-${stream.length}`
  children.beginCall(toolUseId, { id, line: tool })
  children.endCall(toolUseId, id, { failed: false, note: '' })
}

// An owner whose shell is never released swallows every completed that
// follows, and its tile never closes.
export function forgetCrew(refs: AgentEventRefs): void {
  refs.ownedBash.clear()
  refs.pendingTasks.clear()
}

// Done plus a task id means the CLI itself said this child ended. Without a
// task id, done may be our own silence guess, which progress may still undo.
function closedForGood(children: SessionStore, id: string): boolean {
  const held = children.find(id)
  return held?.status === 'done' && (held.taskId ?? '').length > 0
}
