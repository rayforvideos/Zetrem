import { describe, expect, it } from 'vitest'
import { whenLabel } from './when'

const now = Date.parse('2026-08-14T21:00:00Z')

describe('whenLabel — 목록에 걸리는 시각', () => {
  it('가까운 것은 얼마 전인지로 말한다', () => {
    expect(whenLabel(now - 5_000, now)).toBe('just now')
    expect(whenLabel(now - 5 * 60_000, now)).toBe('5m ago')
    expect(whenLabel(now - 3 * 3_600_000, now)).toBe('3h ago')
    expect(whenLabel(now - 2 * 86_400_000, now)).toBe('2d ago')
  })

  it('한 주가 넘으면 날짜로 말한다 — 40d ago 는 아무 뜻도 없다', () => {
    expect(whenLabel(Date.parse('2026-06-01T00:00:00Z'), now)).toMatch(/2026-06-0\d/)
  })

  it('미래로 적힌 시각도 화면을 깨지 않는다', () => {
    expect(whenLabel(now + 100_000, now)).toBe('just now')
  })
})
