import { unhold, wake } from './wake'
import { ownsRunningBash, shellsOwnedBy } from './crew-bash'
export { adoptChildBash, ownsRunningBash, releaseChildBash, shellsOwnedBy } from './crew-bash'
import { addressee, matched } from './addressee'
import { absorbs, resumedAgent } from '@/entities/claude-cli'
import type { AgentSession, SessionStore, TranscriptEntry } from '@/entities/agent-session'
import type { ClaudeTurnEvent } from '@/entities/claude-cli'
import { saidPlainly } from '@/entities/claude-cli'
import { changeBadge, changeLines, resultNote, shapeOfLine, toolNameOf } from '@/entities/tool'
import { clip } from '@/pages/workspace/model/session/agent-events/clip/clip'
import type { AgentEventRefs } from '../agent-events.types'
import type { Match } from './addressee.types'
import { t } from '@lingui/core/macro'

const NOTE_MAX = 48

export const SEND_TOOL = 'SendMessage'

// The diagnostic log the tiles are explained from. Its words are English
// wherever they are written: a log line is read in a bug report, not in the
// app, and a translated one would only make a stuck tile harder to explain.
function log(
  refs: AgentEventRefs,
  event: string,
  shown: { toolUseId?: string | null; taskId?: string | null; seat?: string | null },
  decision: string,
): void {
  refs.crewLog.note({ event, ...shown, decision })
}

function named(
  turn: { toolUseId: string | null; taskId: string },
  seat: string | null = null,
): { toolUseId: string | null; taskId: string; seat: string | null } {
  return { toolUseId: turn.toolUseId, taskId: turn.taskId, seat }
}

// Which of the two ids found the tile is half the answer when a tile goes
// wrong, so every decision that landed on a seat says how it got there.
function by(decision: string, seat: Match): string {
  return `${decision} · matched by ${seat.by}`
}

function shellHold(refs: AgentEventRefs, id: string): string {
  const shells = shellsOwnedBy(refs, id)
  return shells.length === 0 ? 'held: owns a shell' : `held: owns shell ${shells.join(', ')}`
}

export function isCrewEvent(turn: ClaudeTurnEvent): boolean {
  return turn.type.startsWith('child')
}

export function applyCrewEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  const children = refs.stores.children
  switch (turn.type) {
    case 'childOpen': {
      // A grandchild named under a parent we never opened has nothing to hang
      // off. Seating it anyway would put it on the board as a teammate of its
      // own, which is exactly what a helper is not, so it is let go.
      if (turn.parentId !== undefined && !refs.childIds.has(turn.parentId)) {
        log(
          refs,
          turn.type,
          { toolUseId: turn.toolUseId },
          `dropped: parent ${turn.parentId} is not ours`,
        )
        return
      }
      refs.childIds.add(turn.toolUseId)
      // The CLI can register the task before the tool_use block streams in, so
      // the id it announced early is claimed here or the child reads untracked.
      const early = refs.pendingTasks.get(turn.toolUseId)
      refs.pendingTasks.delete(turn.toolUseId)
      const claimed = early === undefined ? '' : ', matched by task id announced early'
      if (children.find(turn.toolUseId) !== null) {
        children.patch(turn.toolUseId, {
          status: 'working',
          ...(early === undefined ? {} : { taskId: early }),
        })
        log(
          refs,
          turn.type,
          { toolUseId: turn.toolUseId, taskId: early ?? null, seat: turn.toolUseId },
          `reopened seat ${turn.toolUseId}${claimed}`,
        )
        return
      }
      log(
        refs,
        turn.type,
        { toolUseId: turn.toolUseId, taskId: early ?? null, seat: turn.toolUseId },
        `opened seat ${turn.toolUseId}${claimed}`,
      )
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
        ...(turn.parentId === undefined ? {} : { parentId: turn.parentId }),
      })
      return
    }
    case 'childStateKnown': {
      const seat = matched(turn, refs)
      if (seat === null) {
        log(refs, turn.type, named(turn), `dropped: no seat, state ${turn.state}`)
        return
      }
      const id = seat.id
      // completed also fires when an agent merely idles waiting on its own
      // backgrounded shell, so that case stays working rather than closing.
      if (turn.state === 'running' || turn.state === 'pending') {
        wake(children, id)
        log(refs, turn.type, named(turn, id), by(`woken: state ${turn.state}`, seat))
        return
      }
      if (turn.state === 'paused') {
        log(refs, turn.type, named(turn, id), by('left alone: paused', seat))
        return
      }
      if (turn.error.length > 0) {
        children.patch(id, { status: 'done', headline: `Failed: ${turn.error.trim()}` })
        log(refs, turn.type, named(turn, id), by('closed: the runtime reported an error', seat))
        return
      }
      if (turn.state === 'completed' && ownsRunningBash(refs, id)) {
        // The same held report as a notification's: the shell's end has to
        // find it, or a child whose end came only this way never closes.
        refs.heldReports.add(id)
        wake(children, id)
        children.patch(id, { heldAtMs: Date.now() })
        log(refs, turn.type, named(turn, id), by(shellHold(refs, id), seat))
        return
      }
      refs.heldReports.delete(id)
      children.patch(id, { status: 'done', heldAtMs: undefined })
      log(refs, turn.type, named(turn, id), by(`closed: state ${turn.state}`, seat))
      return
    }
    case 'childSay':
      if (!refs.childIds.has(turn.toolUseId)) return
      if (!closedForGood(children, turn.toolUseId)) wake(children, turn.toolUseId)
      children.patch(turn.toolUseId, { headline: turn.text.trim(), doing: '' })
      children.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
      return
    case 'childStream': {
      if (!refs.childIds.has(turn.toolUseId) || closedForGood(children, turn.toolUseId)) return
      wake(children, turn.toolUseId)
      // The differ runs here, once, and the raw input is let go: what is stored
      // is the change itself, so no view has to hold a whole file to draw it.
      const change = changeLines(toolNameOf(turn.line), turn.input)
      const count = changeBadge(change)
      children.beginCall(turn.toolUseId, {
        id: turn.callId,
        line: turn.line,
        ...(change.length === 0 ? {} : { change }),
        ...(count === null ? {} : { count }),
      })
      return
    }
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
      const seat = matched(turn, refs)
      if (seat === null) {
        log(
          refs,
          turn.type,
          named(turn),
          `dropped: no seat${turn.done ? ' for a done notice' : ''}`,
        )
        return
      }
      const id = seat.id
      if (turn.summary) children.patch(id, { headline: turn.summary.trim(), doing: '' })
      if (closedForGood(children, id)) {
        log(refs, turn.type, named(turn, id), by('left alone: already closed for good', seat))
        return
      }
      // A run that failed or was killed is over as surely as one that
      // completed; left as working, its tile would never close.
      if (turn.failed) {
        const said = turn.summary.trim()
        children.patch(id, {
          status: 'done',
          doing: '',
          headline: said.length > 0 ? said : t`Failed: the run stopped before it was done`,
        })
        log(refs, turn.type, named(turn, id), by('closed: the run failed or was killed', seat))
        return
      }
      // Done while the agent's own shell still runs would let the silence rule
      // close its tile mid-job.
      const parked = turn.done && !ownsRunningBash(refs, id)
      // A report held back for a running shell is remembered, so the shell's
      // end can park the tile: no further word about this child will come.
      if (turn.done && !parked) refs.heldReports.add(id)
      if (parked) refs.heldReports.delete(id)
      children.patch(id, {
        status: parked ? 'reported' : 'working',
        heldAtMs: turn.done && !parked ? Date.now() : undefined,
      })
      log(
        refs,
        turn.type,
        named(turn, id),
        by(parked ? 'parked' : turn.done ? shellHold(refs, id) : 'working: progress notice', seat),
      )
      return
    }
    case 'childStarted': {
      const seat = matched(turn, refs)
      if (seat === null) {
        if (turn.toolUseId === null) {
          log(refs, turn.type, named(turn), 'dropped: no seat and no tool id to keep it under')
          return
        }
        refs.pendingTasks.set(turn.toolUseId, turn.taskId)
        log(refs, turn.type, named(turn), 'kept the task id: no seat open for it yet')
        return
      }
      const id = seat.id
      wake(children, id)
      unhold(children, id)
      const naming = namedBy(children, id, turn)
      children.patch(id, { taskId: turn.taskId, ...naming })
      const renamed = Object.keys(naming).length > 0
      log(refs, turn.type, named(turn, id), by(renamed ? 'named by runtime' : 'started', seat))
      return
    }
    case 'childProgress': {
      const seat = matched(turn, refs)
      if (seat === null) {
        log(refs, turn.type, named(turn), 'dropped: no seat')
        return
      }
      const id = seat.id
      if (closedForGood(children, id)) {
        log(refs, turn.type, named(turn, id), by('left alone: already closed for good', seat))
        return
      }
      wake(children, id)
      unhold(children, id)
      note(children, id, turn.lastTool)
      children.patch(id, {
        ...(turn.doing ? { doing: turn.doing.trim() } : {}),
        ...(turn.tokens === null ? {} : { tokens: turn.tokens }),
        lastSeenAtMs: Date.now(),
      })
      const tool = turn.lastTool.length === 0 ? '' : `: ${turn.lastTool}`
      log(refs, turn.type, named(turn, id), by(`working${tool}`, seat))
      return
    }
    case 'childClosed': {
      if (!refs.childIds.has(turn.toolUseId)) {
        log(refs, turn.type, { toolUseId: turn.toolUseId }, 'dropped: no seat')
        return
      }
      const shown = { toolUseId: turn.toolUseId, seat: turn.toolUseId }
      if (turn.error) {
        children.patch(turn.toolUseId, {
          status: 'done',
          headline: `Failed: ${turn.error.trim()}`,
        })
        log(refs, turn.type, shown, 'closed: the tool call came back with an error')
        return
      }
      // The CLI hands the Task tool_result back while the child is still running
      // and reports its real end through task events.
      const held = children.find(turn.toolUseId)
      if (held?.detached === true || (held?.taskId ?? '').length > 0) {
        log(refs, turn.type, shown, 'left alone: the runtime tracks this one by task id')
        return
      }
      children.patch(turn.toolUseId, { status: 'done' })
      log(refs, turn.type, shown, 'closed: the tool call came back')
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
  if (agent === null) {
    log(refs, 'wakeResumed', { toolUseId }, `dropped: the reply named no agent for ${called.to}`)
    return
  }
  const children = refs.stores.children
  const held = seatOf(children, agent.id) ?? seatOf(children, called.to)
  if (held !== null) {
    refs.childIds.add(held.id)
    children.patch(held.id, { status: 'working' })
    log(refs, 'wakeResumed', { toolUseId, taskId: agent.id, seat: held.id }, 'woken: seat stood')
    return
  }
  refs.childIds.add(agent.id)
  const name = called.to.length > 0 ? called.to : agent.name
  log(
    refs,
    'wakeResumed',
    { toolUseId, taskId: agent.id, seat: agent.id },
    `opened seat ${agent.id} for ${name}, resumed`,
  )
  children.open({
    id: agent.id,
    // The runtime re-announces a resumed teammate under this same task id.
    taskId: agent.id,
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

// A teammate woken by name after the board was cleared (a restarted session)
// opened its seat knowing only the id it was called by. The runtime names it
// again when it starts, and that name, not the id, is what the tile shows.
function namedBy(
  children: SessionStore,
  id: string,
  turn: { subagentType?: string; description: string },
): Partial<AgentSession> {
  const held = children.find(id)
  if (held === null) return {}
  // Opened by wakeResumed: the id stands in for both the name and the type.
  const nameless = held.subagentType === held.label && held.label === held.id
  if (!nameless) return {}
  return {
    ...(turn.subagentType ? { subagentType: turn.subagentType } : {}),
    ...(turn.description.length > 0 ? { label: turn.description } : {}),
  }
}

function assignment(prompt: string): TranscriptEntry[] {
  const said = prompt.trim()
  return said.length === 0 ? [] : [{ role: 'user', text: said, atMs: Date.now() }]
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
    ? clip(saidPlainly(text).trim(), NOTE_MAX)
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
  refs.heldReports.clear()
}

// Done plus a task id means the CLI itself said this child ended. Without a
// task id, done may be our own silence guess, which progress may still undo.
function closedForGood(children: SessionStore, id: string): boolean {
  const held = children.find(id)
  return held?.status === 'done' && (held.taskId ?? '').length > 0
}
