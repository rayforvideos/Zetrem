import { describe, expect, it } from 'vitest'
import { personaOf } from './persona'

describe('personaOf: giving a role a face', () => {
  it('gives one role the same face every time, or it could not be recognised', () => {
    const a = personaOf('code-reviewer')
    const b = personaOf('code-reviewer')
    expect(a).toEqual(b)
  })

  it('gives a different role a different colour', () => {
    const hues = ['general-purpose', 'Explore', 'code-reviewer', 'Plan'].map(
      (type) => personaOf(type).hue,
    )
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('invents no name, and only tidies the real type into something readable', () => {
    expect(personaOf('code-reviewer').name).toBe('Code Reviewer')
    expect(personaOf('general_purpose').name).toBe('General Purpose')
    expect(personaOf('Explore').name).toBe('Explore')
  })

  it('takes the plugin prefix off, since the part people say is at the end', () => {
    expect(personaOf('humanize-korean:humanize-monolith').name).toBe('Humanize Monolith')
    expect(personaOf('superpowers:brainstorming').name).toBe('Brainstorming')
  })

  it('keeps colours in a range that reads on a dark ground', () => {
    for (const type of ['a', 'b', 'zz', 'general-purpose', '한글에이전트']) {
      const { hue } = personaOf(type)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('picks a face out of a fixed set', () => {
    for (const type of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const { face } = personaOf(type)
      expect(face).toBeGreaterThanOrEqual(0)
      expect(face).toBeLessThan(4)
    }
  })

  it('has a face even for an empty name, since a nameless child still shows', () => {
    const persona = personaOf('')
    expect(persona.name).toBe('Subagent')
    expect(persona.hue).toBeGreaterThanOrEqual(0)
  })
})
