import { describe, expect, it } from 'vitest'
import { trimmedLog } from './app-log'

describe('trimmedLog: the log never grows without bound', () => {
  it('keeps a short log whole', () => {
    expect(trimmedLog('one\ntwo\n', 100)).toBe('one\ntwo\n')
  })

  it('drops the oldest half at the cap, cutting on a line', () => {
    const text = `${'x'.repeat(50)}\n${'y'.repeat(50)}\n${'z'.repeat(50)}\n`
    const kept = trimmedLog(text, 120)
    expect(kept.length).toBeLessThanOrEqual(120)
    expect(kept.endsWith(`${'z'.repeat(50)}\n`)).toBe(true)
    expect(kept.startsWith('x')).toBe(false)
  })
})
