import { describe, expect, it } from 'vitest'
import { roster } from './roster'
import type { AgentSession } from './session'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'claude',
    label: '서브에이전트',
    subagentType: 'Explore',
    model: 'demo',
    status: 'working',
    headline: '읽는 중',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('roster — 데리고 있는 사람들', () => {
  it('일이 없어도 명단은 선다 — 팀은 일보다 먼저 있다', () => {
    const members = roster(['Explore', 'Plan'], [])
    expect(members.map((member) => member.type)).toEqual(['Explore', 'Plan'])
    expect(members.every((member) => member.state === 'idle')).toBe(true)
  })

  it('같은 역할은 한 자리다 — 명단에 같은 사람이 둘 있을 수 없다', () => {
    expect(roster(['Explore', 'Explore'], []).length).toBe(1)
  })

  it('일하는 사람은 명단의 자기 자리에서 상태가 바뀐다', () => {
    const members = roster(['Explore', 'Plan'], [session()])
    const explore = members.find((member) => member.type === 'Explore')
    expect(explore?.state).toBe('working')
    expect(explore?.note).toBe('읽는 중')
    expect(explore?.sessionId).toBe('s1')
  })

  it('명단에 없던 역할도 일을 맡으면 자리가 생긴다', () => {
    const members = roster([], [session({ subagentType: 'code-reviewer' })])
    expect(members.map((member) => member.type)).toEqual(['code-reviewer'])
  })

  it('나를 기다리는 사람이 맨 앞에 선다 — 결정은 내가 한다', () => {
    const members = roster(
      ['Explore', 'Plan', 'Review'],
      [
        session({ id: 'a', subagentType: 'Explore', status: 'working' }),
        session({ id: 'b', subagentType: 'Plan', status: 'waiting' }),
        session({ id: 'c', subagentType: 'Review', status: 'done' }),
      ],
    )
    expect(members.map((member) => member.state)).toEqual(['waiting', 'working', 'done'])
  })

  it('일을 끝낸 사람도 자리를 지킨다 — 보고한 사람이 사라지면 안 된다', () => {
    const members = roster(['Explore'], [session({ status: 'done', headline: '다 고쳤습니다' })])
    expect(members[0]?.state).toBe('done')
    expect(members[0]?.note).toBe('다 고쳤습니다')
  })

  it('한 사람이 두 번 불려 가면 더 급한 쪽이 그 자리에 남는다', () => {
    const members = roster(
      ['Explore'],
      [
        session({ id: 'a', status: 'done' }),
        session({ id: 'b', status: 'waiting', headline: '물어볼 것이 있습니다' }),
      ],
    )
    expect(members.length).toBe(1)
    expect(members[0]?.state).toBe('waiting')
    expect(members[0]?.sessionId).toBe('b')
  })

  it('역할 이름이 없으면 부르던 이름으로 자리를 잡는다', () => {
    const members = roster([], [session({ subagentType: '', label: 'Bash' })])
    expect(members[0]?.type).toBe('Bash')
  })
})
