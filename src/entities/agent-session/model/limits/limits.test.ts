import { describe, expect, it } from 'vitest'
import type { RateLimit } from '../../api/claude/status/status.types'
import { pressing, withLimit } from './limits'

function limit(kind: string, overrides: Partial<RateLimit> = {}): RateLimit {
  return { kind, utilization: 0.1, resetsAtMs: 0, overage: false, status: 'allowed', ...overrides }
}

describe('withLimit: keeping one reading per kind of limit', () => {
  it('replaces the old reading for a kind rather than stacking a second one', () => {
    const held = withLimit([limit('five_hour', { utilization: 0.2 })], limit('five_hour', { utilization: 0.8 }))
    expect(held).toHaveLength(1)
    expect(held[0]!.utilization).toBe(0.8)
  })

  it('keeps the kinds in a fixed order, so the row does not reshuffle as readings arrive', () => {
    const held = withLimit(withLimit([], limit('seven_day')), limit('five_hour'))
    expect(held.map((one) => one.kind)).toEqual(['five_hour', 'seven_day'])
  })

  it('puts a kind it does not know at the end rather than dropping it', () => {
    const held = withLimit([limit('five_hour')], limit('something_new'))
    expect(held.map((one) => one.kind)).toEqual(['five_hour', 'something_new'])
  })
})

describe('pressing: which limit is the one to worry about', () => {
  it('finds nothing to say when no limit has been read yet', () => {
    expect(pressing([])).toBeNull()
  })

  it('takes the fullest limit when all of them are fine', () => {
    const worst = pressing([limit('five_hour', { utilization: 0.3 }), limit('seven_day', { utilization: 0.7 })])
    expect(worst?.kind).toBe('seven_day')
  })

  it('takes a warned limit over a fuller one that is still allowed', () => {
    const warned = limit('seven_day', { utilization: 0.4, status: 'warning' })
    const fuller = limit('five_hour', { utilization: 0.95 })
    expect(pressing([fuller, warned])?.kind).toBe('seven_day')
  })

  it('counts being into overage as worth warning about, even while still allowed', () => {
    const overage = limit('seven_day', { utilization: 0.4, overage: true })
    const fuller = limit('five_hour', { utilization: 0.9 })
    expect(pressing([fuller, overage])?.kind).toBe('seven_day')
  })
})
