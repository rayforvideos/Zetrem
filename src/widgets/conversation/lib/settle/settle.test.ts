import { describe, expect, it } from 'vitest'
import { settle } from './settle'

function field() {
  const calls: string[] = []
  return { calls, blur: () => calls.push('blur'), focus: () => calls.push('focus') }
}

describe('settle — 조합 중인 글자를 보내기 전에 확정한다', () => {
  it('조합 중이면 확정시키고 초점을 돌려준다 — 안 그러면 마지막 글자가 다음 줄에 남는다', () => {
    const area = field()
    const composing = { current: true }
    settle(area, composing)
    expect(area.calls).toEqual(['blur', 'focus'])
    expect(composing.current).toBe(false)
  })

  it('조합 중이 아니면 초점을 건드리지 않는다', () => {
    const area = field()
    settle(area, { current: false })
    expect(area.calls).toEqual([])
  })

  it('입력칸이 아직 없으면 아무 일도 하지 않는다', () => {
    expect(() => settle(null, { current: true })).not.toThrow()
  })
})
