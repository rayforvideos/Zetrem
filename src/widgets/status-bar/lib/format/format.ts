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

function wiredOf(status: StatusState, connectors: Connector[]): Wired | null {
  if (connectors.length > 0) {
    return {
      connected: connectors.filter((one) => one.state === 'connected').length,
      needsAuth: connectors.filter((one) => one.state === 'needs-auth').length,
      total: connectors.length,
    }
  }
  const mcp = status.session?.mcp ?? []
  if (mcp.length === 0) return null
  return {
    connected: mcp.filter((server) => server.status === 'connected').length,
    needsAuth: mcp.filter((server) => server.status === 'needs-auth').length,
    total: mcp.length,
  }
}

export function cells(status: StatusState, connectors: Connector[] = []): Cell[] {
  const out: Cell[] = []

  const percent = contextPercent(status.context)
  if (percent !== null && percent >= CONTEXT_WARN * 100) {
    out.push({ key: 'context', text: `Context ${100 - percent}% left, compacting soon`, warn: true })
  }

  const wired = wiredOf(status, connectors)
  if (wired !== null) {
    out.push({
      key: 'mcp',
      text:
        wired.needsAuth > 0
          ? `MCP ${wired.connected}/${wired.total} · ${wired.needsAuth} need auth`
          : `MCP ${wired.connected}/${wired.total}`,
      warn: wired.needsAuth > 0,
    })
  }

  const update = status.update
  if (update?.current) {
    const stale = isOutdated(update.current, update.latest)
    out.push({
      key: 'update',
      text: stale ? `CLI ${update.current} → ${update.latest} available` : `CLI ${update.current}`,
      warn: stale,
    })
  }

  return out
}
