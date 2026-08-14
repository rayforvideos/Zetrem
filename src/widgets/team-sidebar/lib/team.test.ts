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
    prompt: '',
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

describe('team — 파일이 아는 사람과 세션이 아는 사람', () => {
  it('파일만 있고 세션이 아직 없으면 안 실린 사람이다', () => {
    const [one] = team([def()], [], [])
    expect(one?.loaded).toBe(false)
    expect(one?.origin).toBe('project')
    expect(one?.description).toBe('코드를 본다')
  })

  it('세션이 이름을 대면 그 사람은 실렸다', () => {
    const [one] = team([def()], ['code-reviewer'], [])
    expect(one?.loaded).toBe(true)
  })

  it('엔진이 데려온 사람은 명단에 세우지 않는다 — 우리가 고용한 사람이 아니다', () => {
    expect(team([], ['Explore', 'Plan'], [])).toEqual([])
  })

  it('엔진 사람이 일하고 있어도 명단에는 안 선다 — 그건 작업 지도가 말한다', () => {
    expect(team([], ['Explore'], [member({ type: 'Explore' })])).toEqual([])
  })

  it('일하는 사람은 파일이 아는 설명을 그대로 달고 상태만 바뀐다', () => {
    const [one] = team([def()], ['code-reviewer'], [member()])
    expect(one?.state).toBe('working')
    expect(one?.note).toBe('읽는 중')
    expect(one?.description).toBe('코드를 본다')
    expect(one?.model).toBe('haiku')
  })

  it('나를 기다리는 사람이 맨 앞이다', () => {
    const list = team(
      [def({ name: 'a' }), def({ name: 'b' })],
      [],
      [member({ type: 'b', state: 'waiting' })],
    )
    expect(list.map((entry) => entry.type)).toEqual(['b', 'a'])
  })

  it('한 사람이 두 곳에 있어도 한 줄이다', () => {
    expect(team([def()], ['code-reviewer'], [member()]).length).toBe(1)
  })
})

describe('잠금 — 부를 수 있는 사람과 없는 사람', () => {
  it('잠그지 않아도 세션이 실은 우리 사람은 부를 수 있다', () => {
    const [one] = team([def({ name: 'ours' })], ['ours'], [], null)
    expect(one?.callable).toBe(true)
  })

  it('잠금 목록에 없는 우리 사람은 부를 수 없다', () => {
    const list = team(
      [def({ name: 'ours' }), def({ name: 'benched' })],
      ['ours', 'benched'],
      [],
      ['ours'],
    )
    expect(list.find((entry) => entry.type === 'ours')?.callable).toBe(true)
    expect(list.find((entry) => entry.type === 'benched')?.callable).toBe(false)
  })

  it('세션이 아직 안 실은 사람은 잠금과 무관하게 부를 수 없다', () => {
    const [one] = team([def({ name: 'ours' })], [], [], ['ours'])
    expect(one?.loaded).toBe(false)
    expect(one?.callable).toBe(false)
  })
})
