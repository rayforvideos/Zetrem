import { isOutdated } from '@/entities/agent-session'
import type { StatusState } from '@/entities/agent-session'
import { formatResetTime } from '@/shared/lib/datetime'
import { formatTokens, limitKindLabel } from '@/shared/lib/units'

/**
 * 상태줄의 칸을 만든다 — 순수 함수라 화면 없이 테스트된다.
 *
 * 두 규칙이 전부다: ① 모르는 값은 칸을 만들지 않는다 (빈 자리를 두면 줄이 흔들린다)
 * ② 경고는 색이 아니라 문장으로 말한다 (warn: true 인 칸만 어절이 길어진다).
 */
export type Cell = { key: string; text: string; warn: boolean }

/** 컨텍스트가 이 비율을 넘게 차면 압축이 임박이다 — 사람이 손쓸 수 있는 마지막 지점 */
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
      // 분모를 모르는 동안은 절대값만 — % 를 지어내지 않는다
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
    // 문자열 부등호(!==)로는 다운그레이드도 "새 버전"으로 오인한다 —
    // 실제로 뒤인지는 isOutdated 의 숫자 비교로만 판단한다
    const stale = isOutdated(update.current, update.latest)
    out.push({
      key: 'update',
      text: stale ? `새 버전 ${update.latest} 있음` : update.current,
      warn: stale,
    })
  }

  return out
}
