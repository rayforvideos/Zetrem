import { describe, expect, it } from 'vitest'
import { CHARACTERS, characterOf, isCharacterId, moodOf } from './character'

describe('캐릭터는 고른 것이 있으면 그것, 없으면 이름이 정한다', () => {
  it('고른 캐릭터를 그대로 쓴다', () => {
    expect(characterOf('code-reviewer', 'ghost')).toBe('ghost')
  })

  it('고른 적 없으면 이름에서 정해진다 — 엔진이 데려온 사람도 얼굴을 갖는다', () => {
    const first = characterOf('Explore')
    expect(CHARACTERS).toContain(first)
    expect(characterOf('Explore')).toBe(first)
  })

  it('이름이 다르면 대체로 다른 얼굴이 선다', () => {
    const names = ['Explore', 'Plan', 'code-reviewer', 'general-purpose', 'statusline-setup']
    expect(new Set(names.map((name) => characterOf(name))).size).toBeGreaterThan(1)
  })

  it('모르는 값은 고른 것으로 치지 않는다 — 파일이 손상돼도 얼굴은 선다', () => {
    expect(isCharacterId('dragon')).toBe(false)
    expect(CHARACTERS).toContain(characterOf('Explore', 'dragon'))
    expect(CHARACTERS).toContain(characterOf('Explore', null))
  })
})

describe('상태는 그 사람이 지금 무엇을 하는지 그린다', () => {
  it('네 상태가 네 표정으로 간다', () => {
    expect(moodOf('working')).toBe('busy')
    expect(moodOf('waiting')).toBe('default')
    expect(moodOf('done')).toBe('relax')
    expect(moodOf('idle')).toBe('sleepy')
  })
})
