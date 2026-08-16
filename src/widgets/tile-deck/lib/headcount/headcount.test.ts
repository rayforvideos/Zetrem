import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { headcount } from './headcount'

const one = (status: AgentSession['status']): AgentSession => ({ status }) as AgentSession

describe('headcount: what the board says about the room', () => {
  it('counts each state in the order you would ask about them', () => {
    expect(headcount([one('working'), one('working'), one('waiting'), one('reported')])).toBe(
      'Your crew · 2 working · 1 waiting on you · 1 reported back',
    )
  })

  it('leaves out a state nobody is in', () => {
    expect(headcount([one('working')])).toBe('Your crew · 1 working')
  })

  it('still says something for a room of states it has no word for', () => {
    expect(headcount([one('done')])).toBe('Your crew · 1 out')
  })
})
