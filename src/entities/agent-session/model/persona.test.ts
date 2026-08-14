import { describe, expect, it } from 'vitest'
import { personaOf } from './persona'

describe('personaOf — 역할에 얼굴을 붙인다', () => {
  it('같은 역할은 늘 같은 얼굴이다 — 켤 때마다 색이 바뀌면 알아볼 수 없다', () => {
    const a = personaOf('code-reviewer')
    const b = personaOf('code-reviewer')
    expect(a).toEqual(b)
  })

  it('다른 역할은 다른 색을 받는다', () => {
    const hues = ['general-purpose', 'Explore', 'code-reviewer', 'Plan'].map(
      (type) => personaOf(type).hue,
    )
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('이름을 지어내지 않는다 — 실제 타입을 사람이 읽게 다듬을 뿐이다', () => {
    expect(personaOf('code-reviewer').name).toBe('Code Reviewer')
    expect(personaOf('general_purpose').name).toBe('General Purpose')
    expect(personaOf('Explore').name).toBe('Explore')
  })

  it('플러그인 접두사는 떼어낸다 — 사람이 부르는 이름은 뒤쪽이다', () => {
    expect(personaOf('humanize-korean:humanize-monolith').name).toBe('Humanize Monolith')
    expect(personaOf('superpowers:brainstorming').name).toBe('Brainstorming')
  })

  it('색은 어두운 바탕에서 읽히는 범위 안에 있다', () => {
    for (const type of ['a', 'b', 'zz', 'general-purpose', '한글에이전트']) {
      const { hue } = personaOf(type)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('얼굴 변형은 정해진 개수 안에서 고른다', () => {
    for (const type of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const { face } = personaOf(type)
      expect(face).toBeGreaterThanOrEqual(0)
      expect(face).toBeLessThan(4)
    }
  })

  it('빈 이름에도 얼굴이 있다 — 이름을 모르는 자식도 화면에는 서야 한다', () => {
    const persona = personaOf('')
    expect(persona.name).toBe('서브에이전트')
    expect(persona.hue).toBeGreaterThanOrEqual(0)
  })
})
