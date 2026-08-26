import { describe, expect, it } from 'vitest'
import type { ResultMetrics } from '@/entities/claude-cli'
import type { StatusState } from '../status-store/status-store.types'
import { spentAfter } from './spend'

const before: StatusState['cost'] = {
  usd: 1.25,
  lastTurnUsd: 0.4,
  tokens: { in: 10, out: 20, cacheRead: 30, cacheCreate: 40 },
  durationMs: 5000,
  turns: 3,
}

function metrics(over: Partial<ResultMetrics> = {}): ResultMetrics {
  return {
    ...{},
    costUsd: 1.9,
    tokens: { in: 12, out: 25, cacheRead: 33, cacheCreate: 44 },
    durationMs: 7000,
    turns: 4,
    contextWindow: null,
    apiErrorStatus: null,
    stopReason: null,
    ...over,
  }
}

describe('spentAfter: what a turn adds to what a session has spent', () => {
  it('takes the new totals and says what this turn cost', () => {
    const after = spentAfter(before, metrics())
    expect(after.usd).toBe(1.9)
    expect(after.lastTurnUsd).toBeCloseTo(0.65, 5)
    expect(after.turns).toBe(4)
  })

  it('does not let a reading with no cost in it refund what was spent', () => {
    const after = spentAfter(before, metrics({ costUsd: 0, turns: 0 }))
    expect(after.usd).toBe(1.25)
    expect(after.lastTurnUsd).toBe(0)
    expect(after.turns).toBe(3)
  })

  it('keeps the tokens it had when a reading carries none', () => {
    const empty = { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }
    expect(spentAfter(before, metrics({ tokens: empty })).tokens).toEqual(before.tokens)
  })

  it('takes zero tokens when there were none to begin with, since that is the truth', () => {
    const fresh = {
      ...before,
      usd: 0,
      turns: 0,
      tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    }
    const empty = { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }
    expect(spentAfter(fresh, metrics({ tokens: empty })).tokens).toEqual(empty)
  })
})

describe('a resumed chat keeps paying on top of what it already cost', () => {
  const fresh: StatusState['cost'] = { ...before, usd: 0.9, lastTurnUsd: 0, turns: 0 }

  it('adds the new process total to what the chat had already spent', () => {
    expect(spentAfter(fresh, metrics({ costUsd: 0.25 }), 0.9).usd).toBeCloseTo(1.15, 5)
  })

  it('never reads lower than what the chat had spent, since a chat cannot get cheaper', () => {
    expect(spentAfter(fresh, metrics({ costUsd: 0 }), 0.9).usd).toBe(0.9)
  })

  it('counts only the new process when nothing was carried over', () => {
    const empty = { ...before, usd: 0, lastTurnUsd: 0, turns: 0 }
    expect(spentAfter(empty, metrics({ costUsd: 0.25 })).usd).toBeCloseTo(0.25, 5)
  })
})
