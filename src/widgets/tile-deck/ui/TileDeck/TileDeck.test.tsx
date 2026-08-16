import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import type { DeckState } from '../../model/deck-machine/deck-machine.types'
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
      face="onigiri"
      name="Ray"
      viewport={viewport}
      nowMs={0}
      terminal={<div>터미널</div>}
    />,
  )
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

const fleet = [0, 1, 2, 3, 4, 5].map((i) => session(`s${i}`))
const ids = fleet.map((s) => s.id)

describe('TileDeck: the rule about where the eye goes', () => {
  it('gives the eye to exactly one tile, even with six waiting', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      waitingSinceMs: 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)

    expect(count(html, 'opacity:0.85')).toBe(1)
    expect(count(html, 'data-waiting')).toBe(6)
  })

  it('gives the eye to whichever has waited longest', () => {
    const waitingFleet = fleet.map((s, i) => ({
      ...s,
      status: 'waiting' as const,
      waitingSinceMs: i === 3 ? 10 : 1000 + i,
    }))
    const html = render({ kind: 'fanned', ids, closing: [] }, waitingFleet)
    const owners = html.split('data-card').slice(1).filter((chunk) => chunk.includes('data-eye'))
    expect(owners).toHaveLength(1)
    expect(owners[0]).toContain('"s3"')
  })

  it('marks nothing when nobody is waiting', () => {
    const html = render({ kind: 'fanned', ids, closing: [] }, fleet)
    expect(count(html, 'data-waiting')).toBe(0)
  })

  it('leaves out the one on its way off the board, waiting or not', () => {
    const closingWaiter = { ...session('s9'), status: 'waiting' as const, waitingSinceMs: 1 }
    const html = render({ kind: 'fanned', ids, closing: ['s9'] }, [...fleet, closingWaiter])
    expect(count(html, 'data-eye')).toBe(0)
    expect(html).not.toContain('data-card="s9"')
  })

  it('gives the eye to the one that waits', () => {
    const one = fleet.map((s, i) =>
      i === 2 ? { ...s, status: 'waiting' as const, waitingSinceMs: 5 } : s,
    )
    const html = render({ kind: 'fanned', ids, closing: [] }, one)
    expect(count(html, 'data-eye')).toBe(1)
    expect(count(html, 'data-waiting')).toBe(1)
  })
})

describe('TileDeck', () => {
  it('shows the terminal alone and no session tiles', () => {
    const html = render({ kind: 'solo' }, fleet)
    expect(html).toContain('터미널')
    expect(count(html, 'data-status')).toBe(0)
  })

  it('keeps the terminal through a fan, because unmounting it would cut the shell', () => {
    const html = render({ kind: 'fanned', ids, closing: [] }, fleet)
    expect(html).toContain('터미널')
    expect(count(html, 'data-terminal-tile')).toBe(1)
    expect(count(html, 'data-card')).toBe(6)
  })

  it('keeps the tile to itself when only one is out', () => {
    const html = render({ kind: 'fanned', ids: ['s0'], closing: [] }, [fleet[0]!])
    expect(count(html, 'data-status')).toBe(1)
    expect(html).not.toContain('data-crew-board')
  })
})

describe('TileDeck: a tile that is leaving', () => {
  it('keeps drawing a tile that is on its way out, so it can be seen to go', () => {
    const html = renderToStaticMarkup(
      <TileDeck
        state={{ kind: 'fanned', ids: ['b'], closing: ['a'] }}
        sessions={[session('a'), session('b')]}
        face="onigiri"
        name="Ray"
        viewport={{ w: 1440, h: 900 }}
        nowMs={0}
        terminal={<div />}
      />,
    )
    expect(html).toContain('data-closing="true"')
    expect(html).toContain('zt-tile-out')
  })

  it('gives the standing tiles their new places at once, without waiting for the leaver', () => {
    const two = renderToStaticMarkup(
      <TileDeck
        state={{ kind: 'fanned', ids: ['a', 'b'], closing: [] }}
        sessions={[session('a'), session('b')]}
        face="onigiri"
        name="Ray"
        viewport={{ w: 1440, h: 900 }}
        nowMs={0}
        terminal={<div />}
      />,
    )
    const oneLeaving = renderToStaticMarkup(
      <TileDeck
        state={{ kind: 'fanned', ids: ['b'], closing: ['a'] }}
        sessions={[session('a'), session('b')]}
        face="onigiri"
        name="Ray"
        viewport={{ w: 1440, h: 900 }}
        nowMs={0}
        terminal={<div />}
      />,
    )
    expect(oneLeaving).not.toBe(two)
  })
})
