import { describe, expect, it } from 'vitest'
import { GREETING_MS, greetingAt, greetingCount } from './greetings'

describe('greetingAt — 빈 화면이 매번 같은 말을 하지 않는다', () => {
  it('돌아가며 서로 다른 말을 낸다', () => {
    const seen = new Set(Array.from({ length: greetingCount() }, (_, i) => greetingAt(i)))
    expect(seen.size).toBe(greetingCount())
  })

  it('한 바퀴 돌면 처음으로 돌아온다', () => {
    expect(greetingAt(greetingCount())).toBe(greetingAt(0))
  })

  it('음수여도 무너지지 않는다 — 시계를 어떻게 세든 글귀는 나온다', () => {
    expect(greetingAt(-1).length).toBeGreaterThan(0)
    expect(greetingAt(-greetingCount() - 3).length).toBeGreaterThan(0)
  })

  it('빈 글귀는 없다', () => {
    for (let i = 0; i < greetingCount(); i += 1) {
      expect(greetingAt(i).trim().length, `${i}`).toBeGreaterThan(0)
    }
  })

  it('바꾸는 간격이 읽을 수 있을 만큼은 된다', () => {
    expect(GREETING_MS).toBeGreaterThanOrEqual(4000)
  })
})
