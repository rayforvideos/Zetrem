import { describe, expect, it } from 'vitest'
import { formatResetTime } from './datetime'

describe('formatResetTime — 초기화 시각은 한 곳에서만 읽는다', () => {
  it('월·일·시:분만 남긴다 — ko-KR toLocaleString 의 마침표·오전/오후를 쓰지 않는다', () => {
    const ms = new Date('2026-08-20T06:00:00Z').getTime()
    expect(formatResetTime(ms, 'UTC')).toBe('8/20 06:00')
  })

  it('시·분을 두 자리로 채운다', () => {
    const ms = new Date('2026-01-05T00:05:00Z').getTime()
    expect(formatResetTime(ms, 'UTC')).toBe('1/5 00:05')
  })

  it('오전/오후·마침표를 남기지 않는다', () => {
    const ms = new Date('2026-08-20T18:00:00Z').getTime()
    const text = formatResetTime(ms, 'UTC')
    expect(text).not.toMatch(/오전|오후/)
    expect(text).not.toContain('.')
  })
})
