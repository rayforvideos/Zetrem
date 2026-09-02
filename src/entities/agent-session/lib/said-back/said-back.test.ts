import { describe, expect, it } from 'vitest'
import type { AgentSession, SessionStatus } from '../../model/session/session.types'
import { saidBack } from './said-back'

function session(status: SessionStatus): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '스타일 점검',
    subagentType: 'Explore',
    model: 'demo-1',
    status,
    headline: '무언가',
    stream: [],
    transcript: [],
    tokens: 0,
    contextUsed: 0,
    startedAtMs: 0,
  }
}

describe('whether a headline is the agent’s own words yet', () => {
  it('is not, while it is still working or waiting on someone', () => {
    expect(saidBack(session('working'))).toBe(false)
    expect(saidBack(session('waiting'))).toBe(false)
  })

  it('is, once it has reported back or finished', () => {
    expect(saidBack(session('reported'))).toBe(true)
    expect(saidBack(session('done'))).toBe(true)
  })
})
