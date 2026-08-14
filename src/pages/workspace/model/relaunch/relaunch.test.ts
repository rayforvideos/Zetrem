import { describe, expect, it } from 'vitest'
import { shouldRelaunch } from './relaunch'
import type { Attempt } from './relaunch.types'

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return { prompt: '이어서', resumed: true, spoke: false, ...overrides }
}

describe('shouldRelaunch — 지난 대화를 못 집어 들었을 때만 다시 건다', () => {
  it('이어 붙이려다 한 마디도 못 하고 죽으면 다시 건다 — 지운 세션 때문에 앱이 멎으면 안 된다', () => {
    expect(shouldRelaunch(attempt(), 1)).toBe(true)
  })

  it('말을 한 뒤에 죽은 것은 이어 붙이기 탓이 아니다 — 같은 프롬프트를 두 번 보내면 안 된다', () => {
    expect(shouldRelaunch(attempt({ spoke: true }), 1)).toBe(false)
  })

  it('처음부터 새로 연 세션이 죽은 것은 다시 걸어도 똑같다', () => {
    expect(shouldRelaunch(attempt({ resumed: false }), 1)).toBe(false)
  })

  it('제대로 끝난 것은 실패가 아니다', () => {
    expect(shouldRelaunch(attempt(), 0)).toBe(false)
  })

  it('건 적이 없으면 다시 걸 것도 없다', () => {
    expect(shouldRelaunch(null, 1)).toBe(false)
  })
})
