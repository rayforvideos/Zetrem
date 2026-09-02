import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { tilesOf } from './tiles'

function session(id: string, overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id,
    runnerId: 'fake',
    label: id,
    subagentType: 'Explore',
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

describe('tilesOf: who gets a tile, and who is folded into one', () => {
  it('gives a tile to everyone when nobody has a parent', () => {
    const tiles = tilesOf([session('a'), session('b')])
    expect(tiles.map((tile) => tile.session.id)).toEqual(['a', 'b'])
    expect(tiles.every((tile) => tile.helpers.length === 0)).toBe(true)
  })

  it('folds a subagent of a teammate into that teammate’s tile', () => {
    const tiles = tilesOf([
      session('a'),
      session('helper', { parentId: 'a', startedAtMs: 20 }),
      session('b'),
    ])
    expect(tiles.map((tile) => tile.session.id)).toEqual(['a', 'b'])
    expect(tiles[0]!.helpers.map((one) => one.id)).toEqual(['helper'])
  })

  it('keeps the helpers of one tile in the order they started', () => {
    const tiles = tilesOf([
      session('a'),
      session('late', { parentId: 'a', startedAtMs: 300 }),
      session('early', { parentId: 'a', startedAtMs: 100 }),
    ])
    expect(tiles[0]!.helpers.map((one) => one.id)).toEqual(['early', 'late'])
  })

  it('never gives a helper a tile of its own', () => {
    expect(tilesOf([session('helper', { parentId: 'gone' })])).toEqual([])
  })
})
