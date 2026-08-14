import type { AgentEventRefs } from './agent-events.types'

import { sessionStore, statusStore } from '@/entities/agent-session'
import type {
  ClaudeTurnEvent,
  RateLimit,
  ResultMetrics,
  StatusEvent,
} from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units/units'
import { conversation } from '../conversation/conversation'

const HEADLINE_MAX = 140

export function applyAgentEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  if (isStatusEvent(turn)) statusStore.apply(turn)
  announce(turn, refs)
}

function isStatusEvent(turn: ClaudeTurnEvent): turn is StatusEvent {
  switch (turn.type) {
    case 'session':
    case 'context':
    case 'metrics':
    case 'limit':
    case 'hookStarted':
    case 'hookDone':
    case 'activity':
    case 'compacted':
      return true
    default:
      return false
  }
}

function announce(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  switch (turn.type) {
    case 'headline':
      return conversation.say('assistant', turn.text)
    case 'stream':
      return conversation.tool(turn.line, turn.toolUseId, turn.input)
    case 'delta':
      return conversation.delta(turn.text)
    case 'thinking':
      return conversation.think(turn.text)
    case 'turnEnded':
      conversation.settleDraft()
      return conversation.setStatus('waiting')
    case 'toolResult':
      return conversation.toolResult(turn.toolUseId, {
        stdout: turn.stdout,
        stderr: turn.stderr,
        isError: turn.isError,
        interrupted: turn.interrupted,
      })
    case 'limit':
      if (turn.limit.status !== 'allowed') conversation.system(limitLine(turn.limit))
      return
    case 'compacted':
      return conversation.system(
        compactedLine(turn.trigger, turn.preTokens, turn.postTokens),
      )
    case 'metrics':
      if (turn.metrics.apiErrorStatus) {
        conversation.system(`API error ${turn.metrics.apiErrorStatus}`)
      }
      return conversation.system(turnLine(turn.metrics, statusStore.get().cost.lastTurnUsd))
    case 'permission':
      refs.asks.push(turn)
      if (refs.asks.length === 1) {
        conversation.setPermission({
          requestId: turn.requestId,
          toolName: turn.toolName,
          line: turn.line,
        })
      }
      return conversation.setStatus('waiting')
    case 'childOpen':
      refs.childIds.add(turn.toolUseId)
      return sessionStore.open({
        id: turn.toolUseId,
        runnerId: 'subagent',
        label: turn.label,
        subagentType: turn.subagentType,
        model: 'subagent',
        status: 'working',
        headline: turn.prompt.slice(0, HEADLINE_MAX),
        stream: [],
        transcript: [],
        tokens: 0,
        contextUsed: 0,
        startedAtMs: Date.now(),
      })
    case 'childSay':
      if (!refs.childIds.has(turn.toolUseId)) return
      sessionStore.patch(turn.toolUseId, { headline: turn.text.slice(0, HEADLINE_MAX) })
      return sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
    case 'childStream':
      if (!refs.childIds.has(turn.toolUseId)) return
      return sessionStore.pushStream(turn.toolUseId, turn.line)
    case 'childNotified':
      if (!refs.childIds.has(turn.toolUseId)) return
      if (turn.summary) {
        sessionStore.patch(turn.toolUseId, { headline: turn.summary.slice(0, HEADLINE_MAX) })
      }
      refs.childIds.delete(turn.toolUseId)
      return sessionStore.patch(turn.toolUseId, { status: 'done' })
    case 'childClosed':
      if (!turn.error || !refs.childIds.has(turn.toolUseId)) return
      sessionStore.patch(turn.toolUseId, {
        status: 'done',
        headline: `Failed — ${turn.error.slice(0, 120)}`,
      })
      refs.childIds.delete(turn.toolUseId)
      return
    default:
      return
  }
}

export function limitLine(limit: RateLimit): string {
  const percent = Math.round(limit.utilization * 100)
  const when = formatResetTime(limit.resetsAtMs)
  const overage = limit.overage ? ' · on overage' : ''
  return `${limitKindLabel(limit.kind)} limit ${percent}% used — resets ${when}${overage}`
}

export function compactedLine(
  trigger: string | null,
  preTokens: number | null,
  postTokens: number | null,
): string {
  const base = 'Conversation compacted here'
  if (preTokens === null || postTokens === null) return `${base} — earlier turns live on as a summary`
  const shrink = `${formatTokens(preTokens)} → ${formatTokens(postTokens)}`
  const cause = triggerLabel(trigger)
  return cause ? `${base} (${cause}) — ${shrink}` : `${base} — ${shrink}`
}

export function triggerLabel(trigger: string | null): string | null {
  if (trigger === 'auto') return 'auto'
  if (trigger === 'manual') return 'manual'
  return null
}

export function turnLine(metrics: ResultMetrics, turnUsd: number): string {
  const seconds = (metrics.durationMs / 1000).toFixed(1)
  const cost = turnUsd > 0 ? ` · $${turnUsd.toFixed(4)}` : ''
  return `This turn: ${metrics.tokens.out.toLocaleString('en-US')} out · ${seconds}s${cost}`
}
