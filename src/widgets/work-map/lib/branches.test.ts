import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { MIN_SPAN_MS, workMap } from './branches'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'claude',
    label: '가짜',
    subagentType: 'Explore',
    model: 'demo',
    status: 'working',
    headline: '',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('workMap — 누가 언제 갈라져 나갔나', () => {
  it('아무도 안 나갔으면 그릴 것이 없다', () => {
    expect(workMap([], 1000).branches).toEqual([])
  })

  it('먼저 나간 사람이 위 줄을 잡는다 — 순서가 곧 세로 자리다', () => {
    const map = workMap(
      [session({ id: 'b', startedAtMs: 5000 }), session({ id: 'a', startedAtMs: 1000 })],
      10_000,
    )
    expect(map.branches.map((branch) => branch.id)).toEqual(['a', 'b'])
    expect(map.branches.map((branch) => branch.lane)).toEqual([0, 1])
  })

  it('나간 시각이 가로 자리가 된다 — 처음 나간 사람이 왼쪽 끝이다', () => {
    const map = workMap(
      [session({ id: 'a', startedAtMs: 0 }), session({ id: 'b', startedAtMs: 10_000 })],
      20_000,
    )
    expect(map.branches[0]?.startX).toBe(0)
    expect(map.branches[1]?.startX).toBeCloseTo(0.5, 5)
  })

  it('아직 도는 가지는 지금까지 뻗는다 — 끝을 그리면 끝난 것으로 읽힌다', () => {
    const map = workMap([session({ startedAtMs: 0, status: 'working' })], 40_000)
    expect(map.branches[0]?.live).toBe(true)
    expect(map.branches[0]?.endX).toBe(1)
  })

  it('돌아온 가지는 돌아온 시각에서 멈춘다', () => {
    const map = workMap(
      [session({ startedAtMs: 0, status: 'done', endedAtMs: 20_000 })],
      40_000,
    )
    expect(map.branches[0]?.live).toBe(false)
    expect(map.branches[0]?.endX).toBeCloseTo(0.5, 5)
  })

  it('끝난 시각을 모르면 자기 시작점에 붙인다 — 모르는 길이를 지어내지 않는다', () => {
    const map = workMap([session({ startedAtMs: 10_000, status: 'done' })], 30_000)
    expect(map.branches[0]?.endX).toBe(map.branches[0]?.startX)
  })

  it('막 시작한 순간에도 가로축이 무너지지 않는다', () => {
    const map = workMap([session({ startedAtMs: 1000 })], 1000)
    expect(map.spanMs).toBe(MIN_SPAN_MS)
    expect(map.branches[0]?.startX).toBe(0)
  })
})
