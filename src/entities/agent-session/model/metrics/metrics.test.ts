import { describe, expect, it } from 'vitest'
import { metrics } from './metrics'
import type { AgentSession } from '../session/session.types'

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

describe('the metrics registry', () => {
  it('has no two metrics with the same id', () => {
    const ids = metrics.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gets a number out of every metric', () => {
    for (const metric of metrics) {
      const value = metric.read(session, 4_000)
      expect(Number.isFinite(value), metric.id).toBe(true)
    }
  })

  it('gets readable words out of every metric', () => {
    for (const metric of metrics) {
      expect(metric.format(metric.read(session, 4_000)).length, metric.id).toBeGreaterThan(0)
    }
  })

  it('shortens a token count, because the exact digits are never the point', () => {
    const tokens = metrics.find((m) => m.id === 'tokens')!
    expect(tokens.format(tokens.read(session, 4_000))).toBe('4.2k')
  })

  it('counts elapsed from when it started', () => {
    const elapsed = metrics.find((m) => m.id === 'elapsed')!
    expect(elapsed.read(session, 4_000)).toBe(3)
  })

  it('freezes elapsed at the end time once a session is done', () => {
    const elapsed = metrics.find((m) => m.id === 'elapsed')!
    const done: AgentSession = { ...session, status: 'done', endedAtMs: 4_000 }
    expect(elapsed.read(done, 4_000)).toBe(3)
    expect(elapsed.read(done, 60_000)).toBe(3)
  })

  it('reports context as a percentage', () => {
    const context = metrics.find((m) => m.id === 'context')!
    expect(context.read(session, 4_000)).toBeCloseTo(42, 5)
  })
})
