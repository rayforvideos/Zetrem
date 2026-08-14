import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units'

export type Cell = { key: string; text: string; warn: boolean }

const CONTEXT_WARN = 0.85

export function contextPercent(context: { used: number; window: number | null }): number | null {
  if (!context.window || context.window <= 0) return null
  return Math.round((context.used / context.window) * 100)
}

export function cells(status: StatusState): Cell[] {
  const out: Cell[] = []

  if (status.context.used > 0) {
    const percent = contextPercent(status.context)
    if (percent === null) {
      out.push({ key: 'context', text: `컨텍스트 ${formatTokens(status.context.used)}`, warn: false })
    } else if (percent >= CONTEXT_WARN * 100) {
      out.push({ key: 'context', text: `컨텍스트 ${100 - percent}% 남음 — 곧 압축됩니다`, warn: true })
    } else {
      out.push({ key: 'context', text: `컨텍스트 ${100 - percent}%`, warn: false })
    }
  }

  if (status.cost.usd > 0) {
    out.push({ key: 'cost', text: `$${status.cost.usd.toFixed(2)}`, warn: false })
  }

  const limit = status.limit
  if (limit) {
    const percent = Math.round(limit.utilization * 100)
    const warn = limit.status !== 'allowed' || limit.overage
    const when = formatResetTime(limit.resetsAtMs)
    out.push({
      key: 'limit',
      text: warn
        ? `${limitKindLabel(limit.kind)} 한도 ${percent}% — ${when} 초기화`
        : `${limitKindLabel(limit.kind)} ${percent}%`,
      warn,
    })
  }

  const mcp = status.session?.mcp ?? []
  if (mcp.length > 0) {
    const connected = mcp.filter((server) => server.status === 'connected').length
    const needsAuth = mcp.filter((server) => server.status === 'needs-auth').length
    out.push({
      key: 'mcp',
      text: needsAuth > 0
        ? `MCP ${connected}/${mcp.length} · ${needsAuth}개 인증 필요`
        : `MCP ${connected}/${mcp.length}`,
      warn: needsAuth > 0,
    })
  }

  const update = status.update
  if (update?.current) {
    const stale = isOutdated(update.current, update.latest)
    out.push({
      key: 'update',
      text: stale ? `새 버전 ${update.latest} 있음` : update.current,
      warn: stale,
    })
  }

  return out
}
