import type { AgentEventRefs } from './agent-events.types'

import { statusStore } from '@/entities/agent-session'
import type {
  ClaudeTurnEvent,
  RateLimit,
  ResultMetrics,
  StatusEvent,
} from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units/units'
import { conversation } from '../conversation/conversation'
import { stirred } from './stirred/stirred'
import { SEND_TOOL, applyCrewEvent, isCrewEvent, remember, wakeResumed } from './crew/crew'
import { t } from '@lingui/core/macro'

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
    case 'activity':
    case 'compacted':
      return true
    default:
      return false
  }
}

const BACKGROUND = 'local_bash'
const OVER = ['completed', 'failed', 'killed']

function chore(turn: ClaudeTurnEvent): boolean {
  if (turn.type === 'childStarted' && turn.taskType === BACKGROUND) {
    conversation.startChore(turn.taskId, turn.description)
    return true
  }
  if (turn.type === 'childNotified') conversation.endChore(turn.taskId)
  if (turn.type === 'childStateKnown' && OVER.includes(turn.state)) {
    conversation.endChore(turn.taskId)
  }
  return false
}

function announce(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  if (chore(turn)) return
  if (isCrewEvent(turn)) return applyCrewEvent(turn, refs)
  const held = conversation.get()
  if (stirred(turn, { status: held.status, asked: held.permission !== null })) {
    conversation.setStatus('working')
  }
  switch (turn.type) {
    case 'headline':
      return conversation.say('assistant', turn.text)
    case 'stream':
      if (turn.toolUseId !== null && turn.line.startsWith(SEND_TOOL)) {
        remember(turn.toolUseId, turn.input, refs)
      }
      return conversation.tool(turn.line, turn.toolUseId, turn.input)
    case 'delta':
      return conversation.delta(turn.text)
    case 'thinking':
      return conversation.think(turn.text)
    case 'notice': {
      if (turn.refused !== undefined) refs.onModelRefused(turn.refused)
      return conversation.system(turn.text)
    }
    case 'turnEnded':
      conversation.settleDraft()
      return conversation.setStatus('waiting')
    case 'toolResult':
      wakeResumed(turn.toolUseId, turn.stdout, refs)
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
        conversation.system(t`API error ${turn.metrics.apiErrorStatus}`)
      }
      return conversation.system(turnLine(turn.metrics))
    case 'permissionDropped':
      return drop(turn.requestId, refs)
    case 'permission':
      refs.asks.push(turn)
      if (refs.asks.length === 1) {
        conversation.setPermission({
          requestId: turn.requestId,
          toolName: turn.toolName,
          line: turn.line,
          detail: turn.detail,
        })
      }
      return conversation.setStatus('waiting')
    default:
      return
  }
}

function drop(requestId: string, refs: AgentEventRefs): void {
  const at = refs.asks.findIndex((ask) => ask.requestId === requestId)
  if (at === -1) return
  const showing = conversation.get().permission?.requestId === requestId
  refs.asks.splice(at, 1)
  if (!showing) return
  const next = refs.asks[0]
  if (next === undefined) {
    conversation.setPermission(null)
    return conversation.setStatus('working')
  }
  conversation.setPermission({
    requestId: next.requestId,
    toolName: next.toolName,
    line: next.line,
    detail: next.detail,
  })
}

export function limitLine(limit: RateLimit): string {
  const pct = limit.utilization === null ? null : Math.round(limit.utilization * 100)
  const share = pct === null ? '' : t` ${pct}% used,`
  const when = formatResetTime(limit.resetsAtMs)
  const overage = limit.overage ? t` · on overage` : ''
  return t`${limitKindLabel(limit.kind)} limit${share} resets ${when}${overage}`
}

export function compactedLine(
  trigger: string | null,
  preTokens: number | null,
  postTokens: number | null,
): string {
  const base = t`Conversation compacted here`
  if (preTokens === null || postTokens === null) return t`${base}. Earlier turns live on as a summary.`
  const shrink = `${formatTokens(preTokens)} → ${formatTokens(postTokens)}`
  const cause = triggerLabel(trigger)
  return cause ? `${base} (${cause}): ${shrink}` : `${base}: ${shrink}`
}

export function triggerLabel(trigger: string | null): string | null {
  if (trigger === 'auto') return t`auto`
  if (trigger === 'manual') return t`manual`
  return null
}

export function turnLine(metrics: ResultMetrics): string {
  const seconds = (metrics.durationMs / 1000).toFixed(1)
  const out = metrics.tokens.out.toLocaleString('en-US')
  return t`This turn: ${out} out · ${seconds}s`
}
