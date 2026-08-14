import { describe, expect, it } from 'vitest'
import { addressed } from './dispatch'

describe('addressed — 사람을 지목해 맡긴다', () => {
  it('지목한 사람의 이름을 오케스트레이터가 알아들을 수 있게 앞에 붙인다', () => {
    const out = addressed('파서를 살펴봐', 'Explore')
    expect(out).toContain('Explore')
    expect(out).toContain('subagent_type')
    expect(out.endsWith('파서를 살펴봐')).toBe(true)
  })

  it('아무도 지목하지 않으면 내가 쓴 말 그대로 간다', () => {
    expect(addressed('그냥 해줘', null)).toBe('그냥 해줘')
    expect(addressed('그냥 해줘', '')).toBe('그냥 해줘')
  })

  it('빈 말은 지목해도 빈 말이다 — 이름만 보내지 않는다', () => {
    expect(addressed('   ', 'Explore')).toBe('')
  })

  it('앞뒤 공백은 덜어낸다', () => {
    expect(addressed('  일해  ', null)).toBe('일해')
  })
})
