import { describe, expect, it } from 'vitest'
import { metrics } from './metrics'
import type { AgentSession } from './session'

const session: AgentSession = {
  id: 'a',
  runnerId: 'fake',
  label: '가짜',
  subagentType: 'general-purpose',
  model: 'demo-1',
  status: 'working',
  headline: '작업 중',
  stream: [],
  transcript: [],
  tokens: 4200,
  contextUsed: 0.42,
  startedAtMs: 1_000,
}

describe('metrics 레지스트리', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = metrics.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 지표가 숫자를 낸다', () => {
    for (const metric of metrics) {
      const value = metric.read(session, 4_000)
      expect(Number.isFinite(value), metric.id).toBe(true)
    }
  })

  it('모든 지표가 사람이 읽는 문자열을 낸다', () => {
    for (const metric of metrics) {
      expect(metric.format(metric.read(session, 4_000)).length, metric.id).toBeGreaterThan(0)
    }
  })

  it('토큰 지표는 천 단위로 끊어 낸다 — 3층 숫자는 초점을 스치듯 읽힌다', () => {
    const tokens = metrics.find((m) => m.id === 'tokens')!
    expect(tokens.format(tokens.read(session, 4_000))).toBe('4,200')
  })

  it('경과 지표는 시작 시각을 뺀 초를 낸다', () => {
    const elapsed = metrics.find((m) => m.id === 'elapsed')!
    expect(elapsed.read(session, 4_000)).toBe(3)
  })

  it('Context 지표는 백분율로 낸다', () => {
    const context = metrics.find((m) => m.id === 'context')!
    expect(context.read(session, 4_000)).toBeCloseTo(42, 5)
  })
})
