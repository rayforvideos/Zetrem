import { describe, expect, it } from 'vitest'
import { beganComposing, endedComposing, newComposer, sent } from './composer'

describe('composer — 조합이 끝난 뒤에 한 번 더 비워야 하는지 안다', () => {
  it('조합 중에 보냈으면 조합이 끝날 때 비울 빚이 남는다', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    expect(endedComposing(composer)).toBe(true)
  })

  it('조합 없이 보냈으면 빚이 없다 — 영어로 치면 그 자리에서 끝난다', () => {
    const composer = newComposer()
    sent(composer)
    expect(endedComposing(composer)).toBe(false)
  })

  it('보낸 적 없이 끝난 조합은 아무것도 요구하지 않는다 — 그냥 타자를 친 것이다', () => {
    const composer = newComposer()
    beganComposing(composer)
    expect(endedComposing(composer)).toBe(false)
  })

  it('빚은 한 번만 갚는다 — 조합이 두 번 끝났다고 두 번 비우지 않는다', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    expect(endedComposing(composer)).toBe(true)
    expect(endedComposing(composer)).toBe(false)
  })

  it('연달아 보내도 상태가 새지 않는다', () => {
    const composer = newComposer()
    for (let round = 0; round < 3; round += 1) {
      beganComposing(composer)
      sent(composer)
      expect(endedComposing(composer), `${round}`).toBe(true)
    }
  })

  it('보낸 뒤 조합을 다시 시작해도 옛 빚이 되살아나지 않는다', () => {
    const composer = newComposer()
    beganComposing(composer)
    sent(composer)
    endedComposing(composer)
    beganComposing(composer)
    expect(endedComposing(composer)).toBe(false)
  })
})
