import { describe, expect, it } from 'vitest'
import type { AgentDef } from '@/entities/agent-def'
import { personaOf } from '@/entities/agent-session'
import type { RosterMember } from '@/entities/agent-session'
import { team } from './team'

function def(overrides: Partial<AgentDef> = {}): AgentDef {
  return {
    name: 'code-reviewer',
    description: '코드를 본다',
    model: 'haiku',
    tools: [],
    knowledge: [],
    ownCopy: false,
    prompt: '',
    character: null,
    source: 'project',
    path: '.claude/agents/code-reviewer.md',
    ...overrides,
  }
}

function member(overrides: Partial<RosterMember> = {}): RosterMember {
  return {
    type: 'code-reviewer',
    persona: personaOf('code-reviewer'),
    state: 'working',
    note: '읽는 중',
    sessionId: 's1',
    ...overrides,
  }
}

describe('team: who the files know and who the session knows', () => {
  it('marks someone on disk but not in the session as not loaded', () => {
    const [one] = team([def()], [], [])
    expect(one?.loaded).toBe(false)
    expect(one?.origin).toBe('project')
    expect(one?.description).toBe('코드를 본다')
  })

  it('marks someone the session names as loaded', () => {
    const [one] = team([def()], ['code-reviewer'], [])
    expect(one?.loaded).toBe(true)
  })

  it('leaves the engine own agents off the roster, since we did not hire them', () => {
    expect(team([], ['Explore', 'Plan'], [])).toEqual([])
  })

  it('keeps an engine agent off the roster even while it works', () => {
    expect(team([], ['Explore'], [member({ type: 'Explore' })])).toEqual([])
  })

  it('keeps the description from the file and changes only the state', () => {
    const [one] = team([def()], ['code-reviewer'], [member()])
    expect(one?.state).toBe('working')
    expect(one?.note).toBe('읽는 중')
    expect(one?.description).toBe('코드를 본다')
    expect(one?.model).toBe('haiku')
  })

  it('puts whoever is waiting on you at the top', () => {
    const list = team(
      [def({ name: 'a' }), def({ name: 'b' })],
      [],
      [member({ type: 'b', state: 'waiting' })],
    )
    expect(list.map((entry) => entry.type)).toEqual(['b', 'a'])
  })

  it('shows one row for someone who appears twice', () => {
    expect(team([def()], ['code-reviewer'], [member()]).length).toBe(1)
  })
})

describe('locking: who can be called and who cannot', () => {
  it('lets you call our own people the session loaded, lock or no lock', () => {
    const [one] = team([def({ name: 'ours' })], ['ours'], [], null)
    expect(one?.callable).toBe(true)
  })

  it('keeps our own people off limits when the lock does not list them', () => {
    const list = team(
      [def({ name: 'ours' }), def({ name: 'benched' })],
      ['ours', 'benched'],
      [],
      ['ours'],
    )
    expect(list.find((entry) => entry.type === 'ours')?.callable).toBe(true)
    expect(list.find((entry) => entry.type === 'benched')?.callable).toBe(false)
  })

  it('cannot call someone the session never loaded, lock or no lock', () => {
    const [one] = team([def({ name: 'ours' })], [], [], ['ours'])
    expect(one?.loaded).toBe(false)
    expect(one?.callable).toBe(false)
  })
})
