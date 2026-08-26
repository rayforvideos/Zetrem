import { describe, expect, it } from 'vitest'
import { addressed } from './dispatch'

describe('addressed: handing the work to someone by name', () => {
  it('puts the name up front where the orchestrator will read it', () => {
    const out = addressed('파서를 살펴봐', 'Explore')
    expect(out).toContain('Explore')
    expect(out).toContain('subagent_type')
    expect(out.endsWith('파서를 살펴봐')).toBe(true)
  })

  it('sends what you wrote untouched when nobody was named', () => {
    expect(addressed('그냥 해줘', null)).toBe('그냥 해줘')
    expect(addressed('그냥 해줘', '')).toBe('그냥 해줘')
  })

  it('stays empty when there is nothing to say, and does not send a bare name', () => {
    expect(addressed('   ', 'Explore')).toBe('')
  })

  it('trims the space around it', () => {
    expect(addressed('  일해  ', null)).toBe('일해')
  })
})
