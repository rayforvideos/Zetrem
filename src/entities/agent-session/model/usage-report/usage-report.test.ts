import { describe, expect, it } from 'vitest'
import { readUsage, resetsAtOf } from './usage-report'

const REPORT = `You are currently using your subscription to power your Claude Code usage

Current session: 69% used · resets Aug 15 at 2am (Asia/Seoul)
Current week (all models): 52% used · resets Aug 20 at 6am (Asia/Seoul)
Current week (Fable): 44% used · resets Aug 20 at 6am (Asia/Seoul)

What's contributing to your limits usage?
Last 24h · 4899 requests · 58 sessions
  96% of your usage came from sessions active for 8+ hours`

describe('readUsage: reading the limits out of what the CLI prints', () => {
  it('finds every limit in the report and nothing else', () => {
    expect(readUsage(REPORT).map((limit) => limit.kind)).toEqual([
      'five_hour',
      'seven_day',
      'seven_day_fable',
    ])
  })

  it('reads the share used as a fraction', () => {
    expect(readUsage(REPORT)[0]?.utilization).toBeCloseTo(0.69, 5)
  })

  it('keeps the reset in the words the CLI used, without the timezone in brackets', () => {
    expect(readUsage(REPORT)[0]?.resetsText).toBe('Aug 15 at 2am')
  })

  it('calls a limit that is nearly spent a warning, since the report does not say', () => {
    const [calm, heavy] = readUsage(
      'Current session: 12% used · resets later\nCurrent week (all models): 91% used · resets later',
    )
    expect(calm?.status).toBe('allowed')
    expect(heavy?.status).toBe('allowed_warning')
  })

  it('takes a line that never says when it resets', () => {
    const [only] = readUsage('Current session: 40% used')
    expect(only).toMatchObject({ kind: 'five_hour', utilization: 0.4 })
    expect(only?.resetsText).toBeUndefined()
  })

  it('is not fooled by the request counts further down the report', () => {
    expect(readUsage('Last 24h · 4899 requests\n  96% of your usage came from sessions')).toEqual([])
  })

  it('keeps the first reading when a kind is named twice', () => {
    const found = readUsage(
      'Current week (all models): 52% used\nCurrent week (all models): 99% used',
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.utilization).toBeCloseTo(0.52, 5)
  })

  it('says nothing at all when the wording is not what it knows', () => {
    expect(readUsage('You have used most of your quota this week.')).toEqual([])
  })

  it('says nothing for an empty report rather than inventing a zero', () => {
    expect(readUsage('')).toEqual([])
  })
})

describe('resetsAtOf: the words the CLI prints become a moment we can count to', () => {
  const now = new Date(2026, 7, 16, 1, 0, 0).getTime()

  it('reads a date and a time in the twelve hour clock', () => {
    const at = resetsAtOf('Aug 16 at 2:09am', now)
    expect(new Date(at).getHours()).toBe(2)
    expect(new Date(at).getMinutes()).toBe(9)
    expect(at - now).toBeGreaterThan(0)
  })

  it('carries the afternoon over', () => {
    expect(new Date(resetsAtOf('Aug 20 at 5:59pm', now)).getHours()).toBe(17)
  })

  it('rolls into next year rather than counting backwards over new year', () => {
    const at = resetsAtOf('Jan 3 at 9:00am', new Date(2026, 11, 28).getTime())
    expect(new Date(at).getFullYear()).toBe(2027)
  })

  it('gives nothing for words it cannot read, so the text is shown as it came', () => {
    expect(resetsAtOf('sometime soon', now)).toBe(0)
    expect(resetsAtOf(undefined, now)).toBe(0)
  })
})
