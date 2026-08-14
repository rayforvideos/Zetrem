import { describe, expect, it } from 'vitest'
import { remembered } from './remembered'

const held = { tools: ['Read'], agents: ['Explore'] }

describe('remembered — 세션이 알려준 것을 한 번에 적어 둔다', () => {
  it('둘 다 새로우면 한 번에 낸다 — 따로 저장하면 서로를 덮어쓴다', () => {
    const patch = remembered({ tools: ['Read', 'Bash'], agents: ['Explore', 'Plan'] }, held)
    expect(patch).toEqual({ knownTools: ['Read', 'Bash'], knownAgents: ['Explore', 'Plan'] })
  })

  it('한쪽만 새로우면 그것만 낸다', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore', 'Plan'] }, held)).toEqual({
      knownAgents: ['Explore', 'Plan'],
    })
  })

  it('바뀐 것이 없으면 아무것도 쓰지 않는다 — 같은 값을 다시 저장하지 않는다', () => {
    expect(remembered({ tools: ['Read'], agents: ['Explore'] }, held)).toBe(null)
  })

  it('세션을 아직 못 봤으면 적을 것이 없다', () => {
    expect(remembered({ tools: undefined, agents: undefined }, held)).toBe(null)
  })

  it('빈 목록은 배운 것이 아니다 — 아는 것을 빈 것으로 덮지 않는다', () => {
    expect(remembered({ tools: [], agents: [] }, held)).toBe(null)
  })

  it('순서가 달라지면 새것으로 본다', () => {
    expect(remembered({ tools: ['Read'], agents: ['Plan', 'Explore'] }, held)).toEqual({
      knownAgents: ['Plan', 'Explore'],
    })
  })
})
