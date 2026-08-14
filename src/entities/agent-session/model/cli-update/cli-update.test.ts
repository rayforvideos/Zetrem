import { describe, expect, it } from 'vitest'
import { isOutdated, managerOf } from './cli-update'

describe('isOutdated', () => {
  it('더 뒤 버전이면 낡았다', () => {
    expect(isOutdated('2.1.231', '2.1.240')).toBe(true)
    expect(isOutdated('2.1.231', '2.2.0')).toBe(true)
    expect(isOutdated('1.9.99', '2.0.0')).toBe(true)
  })

  it('같거나 앞서 있으면 낡지 않았다', () => {
    expect(isOutdated('2.1.231', '2.1.231')).toBe(false)
    expect(isOutdated('2.2.0', '2.1.240')).toBe(false)
  })

  it('숫자로 비교한다 — 문자열 비교였다면 거꾸로 나올 자리다', () => {
    expect(isOutdated('2.1.99', '2.1.231')).toBe(true)
  })

  it('모르는 값은 절대 낡았다고 말하지 않는다', () => {
    expect(isOutdated(null, '2.1.240')).toBe(false)
    expect(isOutdated('2.1.231', null)).toBe(false)
    expect(isOutdated('알 수 없음', '2.1.240')).toBe(false)
  })
})

describe('managerOf', () => {
  it('경로로 관리자를 알아낸다', () => {
    expect(managerOf('/opt/homebrew/Caskroom/claude/2.1.231/claude')).toBe('Homebrew')
    expect(managerOf('/Users/sam/project/node_modules/.bin/claude')).toBe('npm')
    expect(managerOf('/usr/local/bin/claude')).toBeNull()
  })
})
