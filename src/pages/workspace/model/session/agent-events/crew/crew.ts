import { sessionStore } from '@/entities/agent-session'
import { absorbs, resumedAgent } from '@/entities/claude-cli'
import type { AgentSession, TranscriptEntry } from '@/entities/agent-session'
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
  switch (turn.type) {
    case 'childOpen': {
      refs.childIds.add(turn.toolUseId)
      // The CLI can register the task before the tool_use block streams in;
      // the task id it announced early is claimed here, or the tool_result
      // would later read this child as untracked and close it mid-run.
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
      })
      return
    }
    case 'childStateKnown': {
      const id = whose(turn, refs)
      if (id === null) return
      // A state event is the CLI speaking with authority in both directions:
      // running revives, completed or failed ends and the tile closes itself,
      // the way a one-shot teammate should. The exception: completed also
      // fires when an agent merely idles waiting on its own backgrounded
      // shell — closing there is the mid-job flicker, so it stays working.
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
      // The final words often land after the CLI closed the task; keep them,
      // but a closed tile must not stand back up to show them.
      if (!closedForGood(turn.toolUseId)) wake(turn.toolUseId)
      sessionStore.patch(turn.toolUseId, { headline: turn.text.trim(), doing: '' })
      sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
      return
    case 'childStream':
      if (!refs.childIds.has(turn.toolUseId) || closedForGood(turn.toolUseId)) return
      wake(turn.toolUseId)
      sessionStore.beginCall(turn.toolUseId, { id: turn.callId, line: turn.line })
      return
    case 'childSent': {
      if (!refs.childIds.has(turn.toolUseId)) return
      // SendMessage addresses an agent by its id, which is its task id, so the
      // tile on the other end is found the same way a task event finds one.
      const heard = sessionStore.findByTask(turn.to)
      if (heard === null || heard.id === turn.toolUseId) return
      const said = turn.message.trim()
      const teller = sessionStore.find(turn.toolUseId)?.label ?? ''
      // Only the sender's own call carries the words: the agent being woken is
      // handed nothing, so the message is written onto its tile from here.
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
      // The final summary often lands after the CLI already declared the task
      // over; keep the words, but never the status — that reopens the tile.
      if (turn.summary) sessionStore.patch(id, { headline: turn.summary.trim(), doing: '' })
      if (closedForGood(id)) return
      // "Done" while the agent's own shell still runs is only a pause for
      // breath; reported would let the silence rule close a tile mid-job.
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
      // The same agent task starts again when it picks up new work; the CLI
      // saying started outranks whatever the tile settled into meanwhile.
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
      // The CLI hands the Task tool_result back while the child is still
      // running and reports its real end through task events. For anything it
      // tracks by task id (and for explicit background spawns), the
      // tool_result says nothing about the child's life.
      const held = sessionStore.find(turn.toolUseId)
      if (held?.detached === true || (held?.taskId ?? '').length > 0) return
      sessionStore.patch(turn.toolUseId, { status: 'done' })
      return
    }
    default:
      return
  }
}

// The orchestrator speaking to a teammate. The words are only in the call, so
// they are written onto that teammate's tile here, the same as a message from
// another teammate — the difference is only where the line starts.
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

// An agent is addressed by the id the CLI gave it, which is also its task id.
// A tile already stands for it; opening a second one on the raw id is the
// duplicate that used to appear on the board named after the id itself.
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

// A new session is a new set of teammates, so everything held between events
// is stale. The bash map especially: an owner whose shell is never released
// swallows every completed that follows, and its tile never closes.
export function forgetCrew(): void {
  ownedBash.clear()
  pendingTasks.clear()
}

// Task ids the CLI announced before the tool_use block streamed in, waiting
// for their childOpen. Tool-use ids never repeat, so entries only linger for
// tasks whose open never arrives.
const pendingTasks = new Map<string, string>()

// Background shells a child agent started for itself, task id → owning
// session. While one runs, the owner is waiting on it, not finished — and its
// row belongs on the agent's tile, not in the conversation's chores line.
const ownedBash = new Map<string, string>()

export function adoptChildBash(taskId: string, toolUseId: string | null): boolean {
  if (toolUseId === null) return false
  const owner = sessionStore.get().find((s) => s.stream.some((call) => call.id === toolUseId))
  if (owner === undefined) return false
  ownedBash.set(taskId, owner.id)
  wake(owner.id)
  return true
}

export function releaseChildBash(taskId: string): void {
  ownedBash.delete(taskId)
}

function ownsRunningBash(id: string): boolean {
  for (const owner of ownedBash.values()) if (owner === id) return true
  return false
}

// Done plus a task id means the CLI itself said this child ended, so a
// straggling notification must not bring the tile back — that is the
// off-and-on flicker. Without a task id, done may be our own silence guess,
// and progress proving the child alive is still allowed to undo it.
function closedForGood(id: string): boolean {
  const held = sessionStore.find(id)
  return held?.status === 'done' && (held.taskId ?? '').length > 0
}

function wake(toolUseId: string): void {
  const status = sessionStore.find(toolUseId)?.status
  if (status === undefined || status === 'working') return
  sessionStore.patch(toolUseId, { status: 'working', endedAtMs: undefined })
}
