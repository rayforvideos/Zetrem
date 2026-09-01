import type { AgentEventRefs } from './agent-events.types'

import { sessionStore, statusStore } from '@/entities/agent-session'
import type { ClaudeTurnEvent, RateLimit, ResultMetrics, StatusEvent } from '@/entities/claude-cli'
import { formatResetTime } from '@/shared/lib/datetime/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units/units'
import { advancePermission } from '../../chat/conversation/advance-permission'
import { conversation } from '../../chat/conversation/conversation'
import { agentIdIn } from './agent-id/agent-id'
import { stirred } from './stirred/stirred'
import {
  SEND_TOOL,
  adoptChildBash,
  applyCrewEvent,
  isCrewEvent,
  releaseChildBash,
  remember,
  wakeResumed,
} from './crew/crew'
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
    if (adoptChildBash(turn.taskId, turn.toolUseId)) return true
    conversation.startChore(turn.taskId, turn.description)
    return true
  }
  if (turn.type === 'childNotified') {
    conversation.endChore(turn.taskId)
    releaseChildBash(turn.taskId)
  }
  if (turn.type === 'childStateKnown' && OVER.includes(turn.state)) {
    conversation.endChore(turn.taskId)
    releaseChildBash(turn.taskId)
  }
  return false
}

function announce(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  if (chore(turn)) return
  if (isCrewEvent(turn)) {
    applyCrewEvent(turn, refs)
    return
  }
  const held = conversation.get()
  if (stirred(turn, { status: held.status, asked: held.permission !== null })) {
    conversation.setStatus('working')
  }
  switch (turn.type) {
    case 'headline':
      conversation.say('assistant', turn.text)
      return
    case 'stream':
      if (turn.toolUseId !== null && turn.line.startsWith(SEND_TOOL)) {
        remember(turn.toolUseId, turn.input, refs)
      }
      conversation.tool(turn.line, turn.toolUseId, turn.input)
      return
    case 'delta':
      conversation.delta(turn.text)
      return
    case 'thinking':
      conversation.think(turn.text)
      return
    case 'notice': {
      if (turn.refused !== undefined) refs.onModelRefused(turn.refused)
      conversation.system(turn.text)
      return
    }
    case 'turnEnded':
      conversation.settleDraft()
      conversation.setStatus('waiting')
      return
    case 'toolResult': {
      const isolated = agentIdIn(turn)
      if (isolated !== null) sessionStore.patch(isolated.toolUseId, { agentId: isolated.agentId })
      wakeResumed(turn.toolUseId, turn.stdout, refs)
      conversation.toolResult(turn.toolUseId, {
        stdout: turn.stdout,
        stderr: turn.stderr,
        isError: turn.isError,
        interrupted: turn.interrupted,
      })
      return
    }
    case 'limit':
      if (turn.limit.status !== 'allowed') conversation.system(limitLine(turn.limit))
      return
    case 'compacted':
      conversation.system(compactedLine(turn.trigger, turn.preTokens, turn.postTokens))
      return
    case 'metrics':
      if (turn.metrics.apiErrorStatus) {
        conversation.system(t`API error ${turn.metrics.apiErrorStatus}`)
      }
      conversation.system(turnLine(turn.metrics))
      return
    case 'permissionDropped':
      drop(turn.requestId, refs)
      return
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
      conversation.setStatus('waiting')
      return
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
  advancePermission(refs.asks)
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
  if (preTokens === null || postTokens === null)
    return t`${base}. Earlier turns live on as a summary.`
  const shrink = `${formatTokens(preTokens)} → ${formatTokens(postTokens)}`
  const cause = triggerLabel(trigger)
  return cause ? `${base} (${cause}): ${shrink}` : `${base}: ${shrink}`
}

function triggerLabel(trigger: string | null): string | null {
  if (trigger === 'auto') return t`auto`
  if (trigger === 'manual') return t`manual`
  return null
}

export function turnLine(metrics: ResultMetrics): string {
  const seconds = (metrics.durationMs / 1000).toFixed(1)
  const out = metrics.tokens.out.toLocaleString('en-US')
  return t`This turn: ${out} out · ${seconds}s`
}
