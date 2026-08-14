import { describe, expect, it } from 'vitest'
import { resumedAgent } from './resumed'

const real =
  '{"success":true,"message":"Resuming agent abc3415","resumedAgentId":"abc34151ab50738ee","pin":{"id":"abc34151ab50738ee","name":"abc34151ab50738ee","ref":"bb1918"}}'

describe('resumedAgent — 다시 깨운 에이전트를 알아본다', () => {
  it('실제 결과에서 아이디를 집어낸다', () => {
    expect(resumedAgent(real)).toEqual({
      id: 'abc34151ab50738ee',
      name: 'abc34151ab50738ee',
    })
  })

  it('앞에 붙은 말이 있어도 읽는다 — 결과가 늘 순수한 JSON 으로 오지 않는다', () => {
    expect(resumedAgent(`ok\n${real}`)?.id).toBe('abc34151ab50738ee')
  })

  it('성공하지 않은 것은 깨운 것이 아니다', () => {
    expect(resumedAgent('{"success":false,"resumedAgentId":"x"}')).toBe(null)
  })

  it('깨운 아이디가 없으면 없는 것이다 — 그냥 말을 건 것과 구분한다', () => {
    expect(resumedAgent('{"success":true,"message":"delivered"}')).toBe(null)
  })

  it('말이 안 되는 결과에 넘어지지 않는다', () => {
    expect(resumedAgent('')).toBe(null)
    expect(resumedAgent('not json at all')).toBe(null)
    expect(resumedAgent('{broken')).toBe(null)
    expect(resumedAgent('[1,2]')).toBe(null)
  })
})
