import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { computeTint } from '@/entities/glass'
import type { DeckState } from '../model/deck-machine'
import { TileDeck } from './TileDeck'

const viewport = { w: 1440, h: 900 }

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: `에이전트 ${id}`,
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
      tintFor={() => computeTint({ min: 0.5, max: 0.5 }, 0.5)}
      viewport={viewport}
      nowMs={0}
      terminal={<div>터미널</div>}
      terminalTint={computeTint({ min: 0.5, max: 0.5 }, 0.5)}
    />,
  )
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

/** 타일 하나씩의 마크업으로 자른다. 각 타일은 data-status 로 시작한다 */
function tileChunks(html: string): string[] {
  return html.split('data-status').slice(1)
}

const fleet = [0, 1, 2, 3, 4, 5].map((i) => session(`s${i}`))
const ids = fleet.map((s) => s.id)

describe('TileDeck 시선 규칙 (스펙 §6 하드 제약)', () => {
  it('여섯 개가 동시에 대기해도 맥동하는 것은 정확히 하나다', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      waitingSinceMs: 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)

    expect(count(html, 'data-pulse')).toBe(1)
    // 나머지도 자기 상태를 알린다 — 다만 애니메이션 없이
    expect(count(html, 'data-waiting')).toBe(5)
    expect(count(html, 'tile-pulse')).toBe(1)
  })

  it('가장 오래 기다린 타일이 맥동한다', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      // s3 이 가장 먼저 대기에 들어갔다
      waitingSinceMs: i === 3 ? 10 : 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)
    const pulsing = tileChunks(html).filter((chunk) => chunk.includes('data-pulse'))
    expect(pulsing).toHaveLength(1)
    expect(pulsing[0]).toContain('에이전트 s3')
  })

  it('아무도 기다리지 않으면 맥동하는 것도 정적 표시도 없다', () => {
    const html = render({ kind: 'fanned', ids, closing: [] }, fleet)
    expect(count(html, 'data-pulse')).toBe(0)
    expect(count(html, 'data-waiting')).toBe(0)
  })

  it('닫히는 중인 타일은 대기 중이어도 시선을 끌지 않는다', () => {
    const closingWaiter = { ...session('s9'), status: 'waiting' as const, waitingSinceMs: 1 }
    const html = render(
      { kind: 'fanned', ids, closing: ['s9'] },
      [...fleet, closingWaiter],
    )
    // 가장 오래 기다렸지만 물러나는 중이므로 주인이 아니다
    expect(count(html, 'data-pulse')).toBe(0)
    expect(count(html, 'data-closing')).toBe(1)
  })

  it('한 타일만 대기하면 그 타일이 맥동한다', () => {
    const one = fleet.map((s, i) =>
      i === 2 ? { ...s, status: 'waiting' as const, waitingSinceMs: 5 } : s,
    )
    const html = render({ kind: 'fanned', ids, closing: [] }, one)
    expect(count(html, 'data-pulse')).toBe(1)
    expect(count(html, 'data-waiting')).toBe(0)
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
