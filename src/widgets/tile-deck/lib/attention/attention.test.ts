import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { attentionId } from './attention'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
    subagentType: 'general-purpose',
    model: 'demo-1',
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

function waiting(id: string, since?: number): AgentSession {
  return session(id, since === undefined ? { status: 'waiting' } : { status: 'waiting', waitingSinceMs: since })
}

describe('attentionId', () => {
  it('기다리는 타일이 없으면 아무것도 시선을 끌지 않는다', () => {
    expect(attentionId([])).toBeNull()
    expect(attentionId([session('a'), session('b', { status: 'done' })])).toBeNull()
  })

  it('하나만 기다리면 그것이 시선의 주인이다', () => {
    expect(attentionId([session('a'), waiting('b', 10), session('c')])).toBe('b')
  })

  it('여럿이 기다리면 가장 오래 기다린 하나만 고른다 (스펙 §6 하드 제약)', () => {
    const chosen = attentionId([waiting('a', 300), waiting('b', 100), waiting('c', 200)])
    expect(chosen).toBe('b')
  })

  it('여섯 개가 동시에 기다려도 하나만 고른다 — 여섯이 끌면 규칙이 없는 것과 같다', () => {
    const all = [0, 1, 2, 3, 4, 5].map((i) => waiting(`s${i}`, 500 + i))
    expect(attentionId(all)).toBe('s0')
  })

  it('대기 시각이 같으면 목록 순서로 가른다 — 판정은 하나로 정해져야 한다', () => {
    expect(attentionId([waiting('a', 100), waiting('b', 100)])).toBe('a')
  })

  it('대기 시각을 모르는 세션은 아는 세션에 양보한다', () => {
    expect(attentionId([waiting('a'), waiting('b', 900)])).toBe('b')
    expect(attentionId([waiting('a'), waiting('b')])).toBe('a')
  })

  it('작업 중·완료 타일은 후보가 아니다', () => {
    const sessions = [
      session('a', { status: 'working', waitingSinceMs: 1 }),
      session('b', { status: 'done', waitingSinceMs: 2 }),
      waiting('c', 999),
    ]
    expect(attentionId(sessions)).toBe('c')
  })
})
