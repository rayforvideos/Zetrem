import { describe, expect, it } from 'vitest'
import { formatTokens, limitKindLabel } from './units'

describe('formatTokens — 크기감', () => {
  it('1000 미만은 그대로 정수로 보여준다', () => {
    expect(formatTokens(500)).toBe('500')
  })

  it('1000 이상은 k 단위로 줄인다', () => {
    expect(formatTokens(148200)).toBe('148.2k')
  })
})

describe('limitKindLabel — 한도의 이름', () => {
  it('알려진 kind 는 한글 라벨로 바꾼다', () => {
    expect(limitKindLabel('seven_day')).toBe('7-day')
    expect(limitKindLabel('five_hour')).toBe('5-hour')
  })

  it('모르는 kind 는 그대로 통과시킨다 — 거짓 이름을 지어내지 않는다', () => {
    expect(limitKindLabel('unknown_kind')).toBe('unknown_kind')
  })
})
