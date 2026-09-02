import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import type { BoardPhase } from '../../lib/board-phase/board-phase.types'
import type { Rect } from '../../lib/grid/grid.types'
import type { DeckState } from '../../model/deck-machine/deck-machine.types'
import { CrewLayer } from './CrewLayer'
import type { PlacedTile } from './CrewLayer.types'
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
    const owners = html
      .split('data-card')
      .slice(1)
      .filter((chunk) => chunk.includes('data-eye'))
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

  it('folds a subagent a teammate called in into that teammate’s tile', () => {
    const helper = session('g1', {
      parentId: 's0',
      subagentType: 'Explore',
      status: 'reported',
      headline: '두 곳을 찾았습니다',
    })
    const html = render({ kind: 'fanned', ids: ['s0', 'g1'], closing: [] }, [fleet[0]!, helper])
    expect(count(html, 'data-status')).toBe(1)
    expect(html).toContain('data-helper="g1"')
    expect(html).toContain('두 곳을 찾았습니다')
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

// The crew layer is the only place both layers stand at once, and the phase a
// running deck derives from its crew count is fed to it directly here.
const SEAT: Rect = { x: 900, y: 80, w: 400, h: 380 }
const BOARD: Rect = { x: 900, y: 80, w: 400, h: 772 }

function seatedTile(one: AgentSession, closing: boolean): PlacedTile {
  return { session: one, rect: SEAT, delayMs: 0, closing }
}

function layer(phase: BoardPhase, tiles: PlacedTile[], sessions: AgentSession[]): string {
  return renderToStaticMarkup(
    <CrewLayer
      phase={phase}
      tiles={tiles}
      sessions={sessions}
      helpers={new Map()}
      board={BOARD}
      grid
      nowMs={0}
      face="onigiri"
      name="Ray"
      openId={null}
      sweeping={false}
      attention={null}
      onOpen={() => {}}
    />,
  )
}

describe('the deck taking up the board', () => {
  const three = [session('s0'), session('s1'), session('s2')]
  const two = [seatedTile(three[0]!, true), seatedTile(three[1]!, true)]

  it('plays the tiles out under the arriving board, instead of cutting', () => {
    const html = layer('boarding', two, three)

    expect(count(html, 'data-presence="leaving"')).toBe(2)
    expect(html).toContain('zt-tile-out')
    const board = html.slice(html.indexOf('data-crew-board'))
    expect(board).toContain('data-presence="arriving"')
    expect(board).toContain('zt-tile-in')
  })

  it('staggers the cards in, so the board fills rather than appears', () => {
    const html = layer('boarding', two, three)
    const delays = [...html.matchAll(/zt-tile-in [^;"]*? (\d+)ms both/g)].map((hit) => hit[1])
    expect(delays).toEqual(['0', '60', '120'])
  })

  it('lets the leaving tiles take no click meant for the board', () => {
    expect(count(layer('boarding', two, three), 'pointer-events:none')).toBeGreaterThanOrEqual(2)
  })

  it('draws the board alone once it is up', () => {
    const html = layer('board', [], three)
    expect(count(html, 'data-status')).toBe(0)
    expect(html).toContain('data-crew-board')
    expect(html).not.toContain('data-presence')
  })
})

describe('the deck giving the board back', () => {
  const pair = [session('s0'), session('s1')]
  const tiles = [seatedTile(pair[0]!, false), seatedTile(pair[1]!, false)]

  it('plays the board out over the arriving tiles, instead of cutting', () => {
    const html = layer('unboarding', tiles, pair)

    expect(count(html, 'data-presence="arriving"')).toBe(2)
    expect(html).toContain('zt-tile-in')
    const board = html.slice(html.indexOf('data-crew-board'), html.indexOf('data-status'))
    expect(board).toContain('data-presence="leaving"')
    expect(board).toContain('zt-tile-out')
  })

  it('lets the leaving board take no click meant for the tiles', () => {
    const html = layer('unboarding', tiles, pair)
    const board = html.slice(html.indexOf('data-crew-board'), html.indexOf('data-status'))
    expect(board).toContain('pointer-events:none')
  })

  it('draws the tiles alone once the board is gone', () => {
    const html = layer('tiles', tiles, [])
    expect(count(html, 'data-status')).toBe(2)
    expect(html).not.toContain('data-crew-board')
  })
})

describe('a teammate that finishes under the board', () => {
  it('leaves through the board, rather than flashing a tile it never had', () => {
    const crew = ['s0', 's1', 's2'].map((id) => session(id))
    const html = render({ kind: 'fanned', ids: ['s0', 's1', 's2'], closing: ['s9'] }, [
      ...crew,
      session('s9'),
    ])

    expect(html).toContain('data-crew-board')
    expect(html).not.toContain('data-closing')
    expect(count(html, 'data-status')).toBe(0)
  })

  it('still leaves as a tile when tiles are what the deck is showing', () => {
    const html = render({ kind: 'fanned', ids: ['s0'], closing: ['s9'] }, [
      session('s0'),
      session('s9'),
    ])

    expect(html).toContain('data-closing="true"')
    expect(html).not.toContain('data-crew-board')
  })
})
