import { describe, expect, it } from 'vitest'
import { formatResetTime } from './datetime'

describe('formatResetTime: one place decides how a reset time reads', () => {
  it('keeps month, day and time, without the locale dots or am and pm', () => {
    const ms = new Date('2026-08-20T06:00:00Z').getTime()
    expect(formatResetTime(ms, 'UTC')).toBe('8/20 06:00')
  })

  it('pads the hour and minute to two digits', () => {
    const ms = new Date('2026-01-05T00:05:00Z').getTime()
    expect(formatResetTime(ms, 'UTC')).toBe('1/5 00:05')
  })

  it('leaves out am, pm and trailing dots', () => {
    const ms = new Date('2026-08-20T18:00:00Z').getTime()
    const text = formatResetTime(ms, 'UTC')
    expect(text).not.toMatch(/오전|오후/)
    expect(text).not.toContain('.')
  })
})
