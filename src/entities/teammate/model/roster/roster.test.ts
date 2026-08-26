import { describe, expect, it } from 'vitest'
import { roster } from './roster'
import type { AgentSession } from '@/entities/agent-session'

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 's1',
    runnerId: 'claude',
    label: 'Subagent',
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

describe('roster: the people you have', () => {
  it('stands the roster up with no work on, because the team exists before the work', () => {
    const members = roster(['Explore', 'Plan'], [])
    expect(members.map((member) => member.type)).toEqual(['Explore', 'Plan'])
    expect(members.every((member) => member.state === 'idle')).toBe(true)
  })

  it('gives one role one place, so nobody appears twice', () => {
    expect(roster(['Explore', 'Explore'], []).length).toBe(1)
  })

  it('changes the state in place for someone working', () => {
    const members = roster(['Explore', 'Plan'], [session()])
    const explore = members.find((member) => member.type === 'Explore')
    expect(explore?.state).toBe('working')
    expect(explore?.note).toBe('읽는 중')
    expect(explore?.sessionId).toBe('s1')
  })

  it('makes a place for a role that takes work without being listed', () => {
    const members = roster([], [session({ subagentType: 'code-reviewer' })])
    expect(members.map((member) => member.type)).toEqual(['code-reviewer'])
  })

  it('puts whoever waits on you first, because the decision is yours', () => {
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

  it('keeps a place for someone who finished, so reporting back is not vanishing', () => {
    const members = roster(['Explore'], [session({ status: 'done', headline: '다 고쳤습니다' })])
    expect(members[0]?.state).toBe('done')
    expect(members[0]?.note).toBe('다 고쳤습니다')
  })

  it('keeps the more urgent of two calls in the same place', () => {
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

  it('falls back to what they were called when there is no role name', () => {
    const members = roster([], [session({ subagentType: '', label: 'Bash' })])
    expect(members[0]?.type).toBe('Bash')
  })
})

describe('roster: once the session is over, the team is idle again', () => {
  it('stops calling a finished run live work, so the list is about now', () => {
    const done = session({ id: 's1', status: 'reported', headline: '다 봤습니다' })
    const [member] = roster(['Explore'], [done], false)
    expect(member!.state).toBe('idle')
    expect(member!.note).toBeNull()
  })

  it('still points at the run, so what they did is one click away', () => {
    const done = session({ id: 's1', status: 'reported' })
    expect(roster(['Explore'], [done], false)[0]!.sessionId).toBe('s1')
  })

  it('leaves a live session exactly as it was', () => {
    const busy = session({ id: 's1', status: 'working', headline: '보는 중' })
    const [member] = roster(['Explore'], [busy], true)
    expect(member!.state).toBe('working')
    expect(member!.note).toBe('보는 중')
  })
})

describe('roster: which run a teammate stands for', () => {
  it('points at the newest run, since the oldest is not what you just watched', () => {
    const first = session({ id: 'run-1', headline: '첫 번째', status: 'done' })
    const latest = session({ id: 'run-2', headline: '두 번째', status: 'done' })
    const [member] = roster(['Explore'], [first, latest])
    expect(member!.sessionId).toBe('run-2')
    expect(member!.note).toBe('두 번째')
  })

  it('lets the run that needs you outrank a newer one that does not', () => {
    const asking = session({ id: 'run-1', status: 'waiting' })
    const busy = session({ id: 'run-2', status: 'working' })
    expect(roster(['Explore'], [asking, busy])[0]!.sessionId).toBe('run-1')
  })

  it('lets a run that is still going outrank an older one that has stopped', () => {
    const over = session({ id: 'run-1', status: 'done' })
    const going = session({ id: 'run-2', status: 'working' })
    expect(roster(['Explore'], [over, going])[0]!.sessionId).toBe('run-2')
  })
})
