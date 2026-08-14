import { describe, expect, it } from 'vitest'
import { cells, contextPercent } from './format'
import type { StatusState } from '@/entities/agent-session'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    session: null,
    context: { used: 0, window: null },
    cost: { usd: 0, lastTurnUsd: 0, tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }, durationMs: 0, ttftMs: null, turns: 0 },
    limit: null,
    hooks: [],
    update: null,
    activity: 'idle',
    ...overrides,
  }
}

describe('상태줄의 칸', () => {
  it('아무것도 모르면 칸이 하나도 없다 — 빈 자리를 만들지 않는다', () => {
    expect(cells(state())).toEqual([])
  })

  it('분모를 모르면 % 대신 절대값을 쓴다', () => {
    expect(contextPercent({ used: 28364, window: null })).toBeNull()
    const [cell] = cells(state({ context: { used: 28364, window: null } }))
    expect(cell).toEqual({ key: 'context', text: '컨텍스트 28.4k', warn: false })
  })

  it('분모를 알면 남은 비율로 말한다 — 사람이 신경쓰는 것은 남은 쪽이다', () => {
    expect(contextPercent({ used: 100_000, window: 1_000_000 })).toBe(10)
    const [cell] = cells(state({ context: { used: 100_000, window: 1_000_000 } }))
    expect(cell).toEqual({ key: 'context', text: '컨텍스트 90%', warn: false })
  })

  it('85% 를 넘게 쓰면 그 칸이 문장으로 부푼다', () => {
    const [cell] = cells(state({ context: { used: 880_000, window: 1_000_000 } }))
    expect(cell!.warn).toBe(true)
    expect(cell!.text).toBe('컨텍스트 12% 남음 — 곧 압축됩니다')
  })

  it('비용은 세션 총액이다', () => {
    const found = cells(state({ cost: { ...state().cost, usd: 0.19338 } })).find((c) => c.key === 'cost')
    expect(found).toEqual({ key: 'cost', text: '$0.19', warn: false })
  })

  it('한도는 경고 상태에서만 부푼다', () => {
    const calm = cells(state({ limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed' } }))
    expect(calm.find((c) => c.key === 'limit')).toEqual({ key: 'limit', text: '7일 28%', warn: false })

    const warned = cells(state({ limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' } }))
    expect(warned.find((c) => c.key === 'limit')!.warn).toBe(true)
  })

  it('MCP 는 연결된 수를 세고, 인증이 필요한 것이 있으면 부푼다', () => {
    const session = {
      id: 's', cwd: '/w', model: 'm', permissionMode: 'ask', outputStyle: 'default',
      cliVersion: '2.1.231', apiKeySource: 'none', fastMode: { state: 'off', reason: null },
      counts: { tools: 0, commands: 0, agents: 0, skills: 0, plugins: 0 }, memoryPaths: [],
      mcp: [
        { name: 'a', status: 'connected' }, { name: 'b', status: 'connected' },
        { name: 'c', status: 'needs-auth' }, { name: 'd', status: 'pending' },
      ],
    }
    const found = cells(state({ session })).find((c) => c.key === 'mcp')
    expect(found).toEqual({ key: 'mcp', text: 'MCP 2/4 · 1개 인증 필요', warn: true })
  })

  it('MCP 가 하나도 없으면 칸을 만들지 않는다', () => {
    const session = { ...state().session, mcp: [] }
    expect(cells(state({ session: session as never })).find((c) => c.key === 'mcp')).toBeUndefined()
  })

  it('새 버전이 있으면 버전 칸이 부푼다', () => {
    const calm = cells(state({ update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' } }))
    expect(calm.find((c) => c.key === 'update')).toEqual({ key: 'update', text: '2.1.231', warn: false })

    const stale = cells(state({ update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }))
    expect(stale.find((c) => c.key === 'update')).toEqual({
      key: 'update', text: '새 버전 2.1.240 있음', warn: true,
    })
  })

  it('과거 버전이 최신이라고 나와도 그것은 다운그레이드다 — 새 버전으로 오인하지 않는다', () => {
    // !== 로만 비교하면 2.1.200 이 latest 로 와도 "새 버전 있음" 이 되어버린다 —
    // 문자열 비교가 아니라 isOutdated 로 실제 순서를 봐야 한다
    const downgrade = cells(state({ update: { current: '2.1.231', latest: '2.1.200', managedBy: 'Homebrew' } }))
    expect(downgrade.find((c) => c.key === 'update')).toEqual({
      key: 'update', text: '2.1.231', warn: false,
    })
  })

  it('칸의 순서는 고정이다 — 값이 채워질 때 줄이 흔들리면 안 된다', () => {
    const full = cells(state({
      context: { used: 100_000, window: 1_000_000 },
      cost: { ...state().cost, usd: 0.19 },
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 0, overage: false, status: 'allowed' },
      update: { current: '2.1.231', latest: '2.1.231', managedBy: null },
    }))
    expect(full.map((c) => c.key)).toEqual(['context', 'cost', 'limit', 'update'])
  })
})
