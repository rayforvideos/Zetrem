import type { Cell } from './format.types'

import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'

const CONTEXT_WARN = 0.85

export function contextPercent(context: { used: number; window: number | null }): number | null {
  if (!context.window || context.window <= 0) return null
  return Math.round((context.used / context.window) * 100)
}

export function cells(status: StatusState): Cell[] {
  const out: Cell[] = []

  const percent = contextPercent(status.context)
  if (percent !== null && percent >= CONTEXT_WARN * 100) {
    out.push({ key: 'context', text: `Context ${100 - percent}% left, compacting soon`, warn: true })
  }

  const mcp = status.session?.mcp ?? []
  if (mcp.length > 0) {
    const connected = mcp.filter((server) => server.status === 'connected').length
    const needsAuth = mcp.filter((server) => server.status === 'needs-auth').length
    out.push({
      key: 'mcp',
      text: needsAuth > 0
        ? `MCP ${connected}/${mcp.length} · ${needsAuth} need auth`
        : `MCP ${connected}/${mcp.length}`,
      warn: needsAuth > 0,
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
