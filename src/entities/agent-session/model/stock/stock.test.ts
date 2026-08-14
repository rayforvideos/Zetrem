import { describe, expect, it } from 'vitest'
import { ORCHESTRATOR } from '../roster-lock/roster-lock'
import { allowedStock, stockAgents } from './stock'

const known = [
  'Explore',
  'general-purpose',
  'Ray',
  'Plan',
  ORCHESTRATOR,
  'Joi',
  'humanize-korean:humanize-monolith',
]

describe('stockAgents — 세션이 알려준 것에서 내 사람을 빼면 기본 에이전트다', () => {
  it('내가 만든 사람과 오케스트레이터는 빠진다', () => {
    expect(stockAgents(known, ['Ray', 'Joi'])).toEqual(['Explore', 'general-purpose', 'Plan'])
  })

  it('이름을 박아두지 않는다 — 세션이 주는 대로 따라간다', () => {
    expect(stockAgents(['Brand New Agent'], [])).toEqual(['Brand New Agent'])
  })

  it('플러그인이 데려온 사람은 빼놓는다 — 여기는 Claude Code 가 원래 가진 것만 선다', () => {
    expect(stockAgents(['Explore', 'nx:generate', 'im-not-ai:whoever'], [])).toEqual(['Explore'])
  })

  it('세션을 아직 못 봤으면 아무것도 없다 — 모르는 것을 그리지 않는다', () => {
    expect(stockAgents([], ['Ray'])).toEqual([])
  })

  it('같은 이름이 두 번 와도 한 번만 센다', () => {
    expect(stockAgents(['Explore', 'Explore'], [])).toEqual(['Explore'])
  })

  it('빈 이름은 버린다', () => {
    expect(stockAgents(['', 'Explore'], [])).toEqual(['Explore'])
  })
})

describe('allowedStock — 켠 것만 부를 수 있다', () => {
  const stock = ['Explore', 'Plan', 'general-purpose']

  it('켠 것만 남긴다', () => {
    expect(allowedStock(stock, ['Explore'])).toEqual(['Explore'])
  })

  it('아무것도 안 켰으면 아무것도 못 부른다', () => {
    expect(allowedStock(stock, [])).toEqual([])
  })

  it('이제 없는 이름을 켜 뒀어도 되살리지 않는다 — 설정이 낡아도 없는 사람을 부르지 않는다', () => {
    expect(allowedStock(stock, ['Explore', '사라진에이전트'])).toEqual(['Explore'])
  })

  it('순서는 목록을 따른다 — 켠 순서가 아니라', () => {
    expect(allowedStock(stock, ['general-purpose', 'Explore'])).toEqual(['Explore', 'general-purpose'])
  })
})
