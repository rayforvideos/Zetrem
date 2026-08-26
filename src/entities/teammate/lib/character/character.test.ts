import { describe, expect, it } from 'vitest'
import { CHARACTERS, characterOf, isCharacterId, moodOf } from './character'

describe('the chosen character wins, and the name decides when there is none', () => {
  it('uses the character that was chosen', () => {
    expect(characterOf('code-reviewer', 'ghost')).toBe('ghost')
  })

  it('takes a face from the name, so even an agent the engine brought has one', () => {
    const first = characterOf('Explore')
    expect(CHARACTERS).toContain(first)
    expect(characterOf('Explore')).toBe(first)
  })

  it('mostly gives different names different faces', () => {
    const names = ['Explore', 'Plan', 'code-reviewer', 'general-purpose', 'statusline-setup']
    expect(new Set(names.map((name) => characterOf(name))).size).toBeGreaterThan(1)
  })

  it('does not count an unknown value as a choice, so a spoiled file still has a face', () => {
    expect(isCharacterId('dragon')).toBe(false)
    expect(CHARACTERS).toContain(characterOf('Explore', 'dragon'))
    expect(CHARACTERS).toContain(characterOf('Explore', null))
  })
})

describe('the state draws what that person is doing now', () => {
  it('maps each state to its own expression', () => {
    expect(moodOf('working')).toBe('busy')
    expect(moodOf('waiting')).toBe('default')
    expect(moodOf('done')).toBe('relax')
    expect(moodOf('idle')).toBe('sleepy')
  })
})
