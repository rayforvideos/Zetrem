import { t } from '@lingui/core/macro'
import type { Gauge, Wired } from './format.types'

import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import type { Connector } from '@/entities/connector'
import { formatTokens } from '@/shared/lib/units/units'

const CONTEXT_WARN = 0.85

export function contextPercent(context: { used: number; window: number | null }): number | null {
  if (!context.window || context.window <= 0) return null
  return Math.round((context.used / context.window) * 100)
}

export function reachable(status: StatusState, connectors: Connector[]): Map<string, string> {
  const state = new Map<string, string>()
  for (const server of status.session?.mcp ?? []) state.set(server.name, server.status)
  for (const one of connectors) state.set(one.name, one.state)
  // Only the session knows which servers it could not sign in to, so that verdict
  // stands over the fresher health check.
  for (const server of status.session?.mcp ?? []) {
    if (server.status === 'needs-auth') state.set(server.name, 'needs-auth')
  }
  return state
}

function wiredOf(status: StatusState, connectors: Connector[]): Wired | null {
  const state = reachable(status, connectors)
  if (state.size === 0) return null
  const all = [...state.values()]
  return {
    connected: all.filter((one) => one === 'connected').length,
    needsAuth: all.filter((one) => one === 'needs-auth').length,
    total: all.length,
  }
}

function chatGauge(status: StatusState): Gauge | null {
  const { used } = status.context
  if (used === 0) return null
  const percent = contextPercent(status.context)
  const warn = percent !== null && percent >= CONTEXT_WARN * 100
  return {
    key: 'chat',
    label: warn ? t`compacting soon` : t`this chat`,
    value: percent === null ? formatTokens(used) : `${percent}%`,
    percent,
    warn,
    hint: null,
  }
}

function mcpGauge(wired: Wired): Gauge {
  const n = wired.needsAuth
  return {
    key: 'mcp',
    label: 'MCP',
    value: `${wired.connected}/${wired.total}`,
    percent: wired.total > 0 ? Math.round((wired.connected / wired.total) * 100) : null,
    warn: n > 0,
    hint: n > 0 ? t`${n} need auth` : null,
  }
}

function updateGauge(update: StatusState['update']): Gauge | null {
  if (!update?.current || !isOutdated(update.current, update.latest)) return null
  return {
    key: 'update',
    label: t`Update CLI`,
    value: '',
    percent: null,
    warn: true,
    hint: `${update.current} → ${update.latest ?? ''}`,
  }
}

export function gauges(status: StatusState, connectors: Connector[] = [], checked = true): Gauge[] {
  const out: Gauge[] = []
  const chat = chatGauge(status)
  if (chat) out.push(chat)
  const wired = checked ? wiredOf(status, connectors) : null
  if (wired !== null) out.push(mcpGauge(wired))
  const update = updateGauge(status.update)
  if (update) out.push(update)
  return out
}
