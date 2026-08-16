import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { leading } from './leading'

function one(status: AgentSession['status']): AgentSession {
  return {
    id: `s-${status}`,
    label: 'a task',
    subagentType: 'explore',
    status,
    headline: '',
    transcript: [],
    stream: [],
    startedAtMs: 0,
    lastSeenAtMs: null,
  } as unknown as AgentSession
}

describe('leading: what you are doing while the crew is out', () => {
  it('says you are orchestrating while anyone is working', () => {
    expect(leading([one('working'), one('done')])).toBe('Orchestrating')
  })

  it('says you are held up when someone needs an answer, since the ball is yours', () => {
    expect(leading([one('waiting'), one('done')])).toBe('Held up')
  })

  it('reads the reports once the work is in but not folded in yet', () => {
    expect(leading([one('reported')])).toBe('Reading reports')
  })

  it('says the run is over when everyone is done', () => {
    expect(leading([one('done'), one('done')])).toBe('Wrapped up')
  })

  it('says nothing loud when nobody is out', () => {
    expect(leading([])).toBe('On your own')
  })

  it('puts working ahead of waiting and reported, since that is the live one', () => {
    expect(leading([one('reported'), one('waiting'), one('working')])).toBe('Orchestrating')
  })
})
