import { sessionStore, statusStore } from '@/entities/agent-session'
import type { ClaudeTurnEvent, RateLimit, ResultMetrics } from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units'
import { conversation } from './conversation'

const HEADLINE_MAX = 140

export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; input: unknown }[]
  childIds: Set<string>
}

export function applyAgentEvent(turn: ClaudeTurnEvent, refs: AgentEventRefs): void {
  if (turn.type === 'headline') conversation.say('assistant', turn.text)
  if (turn.type === 'stream') conversation.tool(turn.line, turn.toolUseId, turn.input)
  if (turn.type === 'delta') conversation.delta(turn.text)
  if (turn.type === 'thinking') conversation.think(turn.text)
  if (turn.type === 'turnEnded') {
    conversation.settleDraft()
    conversation.setStatus('waiting')
  }
  if (turn.type === 'toolResult') {
    conversation.toolResult(turn.toolUseId, {
      stdout: turn.stdout,
      stderr: turn.stderr,
      isError: turn.isError,
      interrupted: turn.interrupted,
    })
  }

  if (
    turn.type === 'session' || turn.type === 'context' || turn.type === 'metrics' ||
    turn.type === 'limit' || turn.type === 'hookStarted' || turn.type === 'hookDone' ||
    turn.type === 'activity' || turn.type === 'compacted'
  ) {
    statusStore.apply(turn)
  }

  if (turn.type === 'limit' && turn.limit.status !== 'allowed') {
    conversation.system(limitLine(turn.limit))
  }
  if (turn.type === 'compacted') {
    conversation.system(compactedLine(turn.trigger, turn.preTokens, turn.postTokens))
  }
  if (turn.type === 'metrics') {
    if (turn.metrics.apiErrorStatus) {
      conversation.system(`API error ${turn.metrics.apiErrorStatus}`)
    }
    conversation.system(turnLine(turn.metrics, statusStore.get().cost.lastTurnUsd))
  }

  if (turn.type === 'permission') {
    refs.asks.push(turn)
    if (refs.asks.length === 1) {
      conversation.setPermission({ requestId: turn.requestId, toolName: turn.toolName, line: turn.line })
    }
    conversation.setStatus('waiting')
  }
  if (turn.type === 'childOpen') {
    refs.childIds.add(turn.toolUseId)
    sessionStore.open({
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
  }
  if (turn.type === 'childSay' && refs.childIds.has(turn.toolUseId)) {
    sessionStore.patch(turn.toolUseId, { headline: turn.text.slice(0, HEADLINE_MAX) })
    sessionStore.appendTranscript(turn.toolUseId, { role: turn.role, text: turn.text })
  }
  if (turn.type === 'childStream' && refs.childIds.has(turn.toolUseId)) {
    sessionStore.pushStream(turn.toolUseId, turn.line)
  }
  if (turn.type === 'childNotified' && refs.childIds.has(turn.toolUseId)) {
    if (turn.summary) {
      sessionStore.patch(turn.toolUseId, { headline: turn.summary.slice(0, HEADLINE_MAX) })
    }
    refs.childIds.delete(turn.toolUseId)
    sessionStore.patch(turn.toolUseId, { status: 'done' })
  }
  if (turn.type === 'childClosed' && turn.error && refs.childIds.has(turn.toolUseId)) {
    sessionStore.patch(turn.toolUseId, {
      status: 'done',
      headline: `Failed — ${turn.error.slice(0, 120)}`,
    })
    refs.childIds.delete(turn.toolUseId)
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
