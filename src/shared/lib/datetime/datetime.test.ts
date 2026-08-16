import { describe, expect, it } from 'vitest'
import { formatResetTime, untilLabel } from './datetime'

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

describe('untilLabel: how long until a limit comes back', () => {
  it('counts minutes under an hour', () => {
    expect(untilLabel(12 * 60_000)).toBe('12m')
  })

  it('drops the minutes when they are zero', () => {
    expect(untilLabel(4 * 3_600_000)).toBe('4h')
    expect(untilLabel(4 * 3_600_000 + 12 * 60_000)).toBe('4h 12m')
  })

  it('counts days once it is that far off', () => {
    expect(untilLabel(3 * 86_400_000 + 6 * 3_600_000)).toBe('3d 6h')
  })

  it('does not draw a negative clock for a limit already back', () => {
    expect(untilLabel(-5000)).toBe('any moment')
    expect(untilLabel(0)).toBe('any moment')
  })

  it('says under a minute rather than 0m', () => {
    expect(untilLabel(30_000)).toBe('under a minute')
  })
})
