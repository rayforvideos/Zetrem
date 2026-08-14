import { describe, expect, it } from 'vitest'
import { resumedAgent } from './resumed'

const real =
  '{"success":true,"message":"Resuming agent abc3415","resumedAgentId":"abc34151ab50738ee","pin":{"id":"abc34151ab50738ee","name":"abc34151ab50738ee","ref":"bb1918"}}'

describe('resumedAgent: recognising an agent that was woken again', () => {
  it('picks the id out of a real result', () => {
    expect(resumedAgent(real)).toEqual({
      id: 'abc34151ab50738ee',
      name: 'abc34151ab50738ee',
    })
  })

  it('reads it through a prefix, since a result is not always pure JSON', () => {
    expect(resumedAgent(`ok\n${real}`)?.id).toBe('abc34151ab50738ee')
  })

  it('takes anything but success as nobody woken', () => {
    expect(resumedAgent('{"success":false,"resumedAgentId":"x"}')).toBe(null)
  })

  it('takes a missing id as nobody woken, apart from a message merely delivered', () => {
    expect(resumedAgent('{"success":true,"message":"delivered"}')).toBe(null)
  })

  it('does not fall over on a result that makes no sense', () => {
    expect(resumedAgent('')).toBe(null)
    expect(resumedAgent('not json at all')).toBe(null)
    expect(resumedAgent('{broken')).toBe(null)
    expect(resumedAgent('[1,2]')).toBe(null)
  })
})
