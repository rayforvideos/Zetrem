import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { StatusState } from '@/entities/agent-session'
import { StatusBar } from './StatusBar'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    session: null,
    context: { used: 100_000, window: 1_000_000 },
    cost: { usd: 0.19, lastTurnUsd: 0.04, tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 }, durationMs: 10485, ttftMs: 2352, turns: 3 },
    limit: null,
    hooks: [],
    update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' },
    activity: 'idle',
    ...overrides,
  }
}

describe('StatusBar', () => {
  it('아는 값만 칸으로 세운다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} permissionMode="acceptEdits" model="opus" onModel={() => {}} sessionLive={false} />)
    expect(html).toContain('컨텍스트 90%')
    expect(html).toContain('$0.19')
    expect(html).toContain('2.1.231')
  })

  it('아무것도 모르면 손잡이만 남는다 — 빈 줄이 자리를 차지하지 않게', () => {
    const empty = state({ context: { used: 0, window: null }, cost: { ...state().cost, usd: 0 }, update: null })
    const html = renderToStaticMarkup(<StatusBar status={empty} open={false} onToggle={() => {}} permissionMode="acceptEdits" model="opus" onModel={() => {}} sessionLive={false} />)
    expect(html).not.toContain('컨텍스트')
    expect(html).toContain('aria-expanded="false"')
  })

  it('숫자는 tabular-nums 로 선다 — 값이 바뀔 때 자리가 흔들리면 안 된다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open={false} onToggle={() => {}} permissionMode="acceptEdits" model="opus" onModel={() => {}} sessionLive={false} />)
    expect(html).toContain('tabular-nums')
  })

  it('경고 칸은 색이 아니라 선 굵기로 말한다', () => {
    const warned = state({
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })
    const html = renderToStaticMarkup(<StatusBar status={warned} open={false} onToggle={() => {}} permissionMode="acceptEdits" model="opus" onModel={() => {}} sessionLive={false} />)
    expect(html).toContain('한도 28%')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange)-/)
  })

  it('열려 있으면 손잡이가 그것을 말한다', () => {
    const html = renderToStaticMarkup(<StatusBar status={state()} open onToggle={() => {}} permissionMode="acceptEdits" model="opus" onModel={() => {}} sessionLive={false} />)
    expect(html).toContain('aria-expanded="true"')
  })
})
