import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import type { DeckState } from '../model/deck-machine'
import { TileDeck } from './TileDeck'

const viewport = { w: 1440, h: 900 }

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
    subagentType: 'general-purpose',
    model: 'demo-1',
    status: 'working',
    headline: '작업 중',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

function render(state: DeckState, sessions: AgentSession[]): string {
  return renderToStaticMarkup(
    <TileDeck
      state={state}
      sessions={sessions}
      viewport={viewport}
      nowMs={0}
      terminal={<div>터미널</div>}
    />,
  )
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

function tileChunks(html: string): string[] {
  return html.split('data-status').slice(1)
}

const fleet = [0, 1, 2, 3, 4, 5].map((i) => session(`s${i}`))
const ids = fleet.map((s) => s.id)

describe('TileDeck 시선 규칙 (스펙 §6 하드 제약)', () => {
  it('여섯 개가 동시에 대기해도 시선의 주인은 정확히 하나다', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      waitingSinceMs: 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)

    expect(count(html, 'opacity:0.85')).toBe(1)
    expect(count(html, 'data-waiting')).toBe(6)
  })

  it('가장 오래 기다린 타일이 시선의 주인이다', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      waitingSinceMs: i === 3 ? 10 : 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)
    const owners = tileChunks(html).filter((chunk) => chunk.includes('opacity:0.85'))
    expect(owners).toHaveLength(1)
    expect(owners[0]).toContain('에이전트 s3')
  })

  it('아무도 기다리지 않으면 표시도 없다', () => {
    const html = render({ kind: 'fanned', ids, closing: [] }, fleet)
    expect(count(html, 'data-waiting')).toBe(0)
  })

  it('닫히는 중인 타일은 대기 중이어도 시선을 끌지 않는다', () => {
    const closingWaiter = { ...session('s9'), status: 'waiting' as const, waitingSinceMs: 1 }
    const html = render(
      { kind: 'fanned', ids, closing: ['s9'] },
      [...fleet, closingWaiter],
    )
    expect(count(html, 'opacity:0.85')).toBe(0)
    expect(count(html, 'data-closing')).toBe(1)
  })

  it('한 타일만 대기하면 그 타일이 시선의 주인이다', () => {
    const one = fleet.map((s, i) =>
      i === 2 ? { ...s, status: 'waiting' as const, waitingSinceMs: 5 } : s,
    )
    const html = render({ kind: 'fanned', ids, closing: [] }, one)
    expect(count(html, 'opacity:0.85')).toBe(1)
    expect(count(html, 'data-waiting')).toBe(1)
  })
})

describe('TileDeck', () => {
  it('solo 에서는 터미널 한 장뿐이다 — 세션 타일은 없다', () => {
    const html = render({ kind: 'solo' }, fleet)
    expect(html).toContain('터미널')
    expect(count(html, 'data-status')).toBe(0)
  })

  it('fanned 에서도 터미널은 남는다 — 언마운트되면 셸이 끊긴다', () => {
    const html = render({ kind: 'fanned', ids, closing: [] }, fleet)
    expect(html).toContain('터미널')
    expect(count(html, 'data-terminal-tile')).toBe(1)
    expect(count(html, 'data-status')).toBe(6)
  })
})
