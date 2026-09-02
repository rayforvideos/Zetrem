import { describe, expect, it } from 'vitest'
import type { TeamMember } from '../team/team.types'
import { sectionsOf } from './team-sections'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    type: 'code-reviewer',
    name: 'code-reviewer',
    description: 'Looks at what changed',
    model: 'sonnet',
    character: null,
    origin: 'user',
    loaded: false,
    callable: false,
    state: 'idle',
    note: null,
    sessionId: null,
    ...overrides,
  }
}

describe('sectionsOf: splitting the roster by where a teammate lives', () => {
  it('puts everyone shared into one bucket, in the order given', () => {
    const a = member({ type: 'a', origin: 'user' })
    const b = member({ type: 'b', origin: 'user' })
    expect(sectionsOf([a, b])).toEqual({ shared: [a, b], project: [] })
  })

  it('puts everyone scoped to the project into the other bucket, in order', () => {
    const a = member({ type: 'a', origin: 'project' })
    const b = member({ type: 'b', origin: 'project' })
    expect(sectionsOf([a, b])).toEqual({ shared: [], project: [a, b] })
  })

  it('keeps each side in the order it was given, whichever order they were mixed in', () => {
    const shared1 = member({ type: 'shared1', origin: 'user' })
    const project1 = member({ type: 'project1', origin: 'project' })
    const shared2 = member({ type: 'shared2', origin: 'user' })
    const project2 = member({ type: 'project2', origin: 'project' })
    expect(sectionsOf([shared1, project1, shared2, project2])).toEqual({
      shared: [shared1, shared2],
      project: [project1, project2],
    })
  })

  it('splits nothing into two empty buckets', () => {
    expect(sectionsOf([])).toEqual({ shared: [], project: [] })
  })
})
