import { t } from '@lingui/core/macro'
import type { Cell } from './format.types'

import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import type { Connector } from '@/entities/connector'

const CONTEXT_WARN = 0.85

export function contextPercent(context: { used: number; window: number | null }): number | null {
  if (!context.window || context.window <= 0) return null
  return Math.round((context.used / context.window) * 100)
}

type Wired = { connected: number; needsAuth: number; total: number }

export function reachable(status: StatusState, connectors: Connector[]): Map<string, string> {
  const state = new Map<string, string>()
  for (const server of status.session?.mcp ?? []) state.set(server.name, server.status)
  for (const one of connectors) state.set(one.name, one.state)
  // The health check is fresher about reachability, but only the session
  // knows which servers it could not sign in to; that verdict stands.
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

export function cells(status: StatusState, connectors: Connector[] = [], checked = true): Cell[] {
  const out: Cell[] = []

  const percent = contextPercent(status.context)
  if (percent !== null && percent >= CONTEXT_WARN * 100) {
    out.push({
      key: 'context',
      text: t`Context ${100 - percent}% left, compacting soon`,
      warn: true,
    })
  }

  const wired = checked ? wiredOf(status, connectors) : null
  if (wired !== null) {
    out.push({
      key: 'mcp',
      text:
        wired.needsAuth > 0
          ? t`MCP ${wired.connected}/${wired.total} · ${wired.needsAuth} need auth`
          : `MCP ${wired.connected}/${wired.total}`,
      warn: wired.needsAuth > 0,
    })
  }

  const update = status.update
  if (update?.current) {
    const stale = isOutdated(update.current, update.latest)
    const latest = update.latest ?? ''
    out.push({
      key: 'update',
      text: stale ? t`CLI ${update.current} → ${latest} available` : `CLI ${update.current}`,
      warn: stale,
    })
  }

  return out
}
