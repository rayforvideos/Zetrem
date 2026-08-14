import { describe, expect, it } from 'vitest'
import { ORCHESTRATOR, agentsArgs, peopleSpec } from './roster-lock'

const boss = '너는 오케스트레이터다'

function person(overrides: Partial<Parameters<typeof peopleSpec>[0][number]> = {}) {
  return {
    name: 'scout',
    description: '찾아본다',
    prompt: '당신은 찾습니다.',
    model: 'haiku' as string | null,
    ...overrides,
  }
}

describe('peopleSpec — 앱이 들인 사람을 세션에 실어 보낸다', () => {
  it('이름·설명·지시·모델을 그대로 싣는다', () => {
    expect(peopleSpec([person()])).toEqual({
      scout: { description: '찾아본다', prompt: '당신은 찾습니다.', model: 'haiku' },
    })
  })

  it('모델을 안 정한 사람은 그 칸을 비워 보낸다 — 빈 값을 지어내지 않는다', () => {
    expect(peopleSpec([person({ model: null })]).scout).not.toHaveProperty('model')
  })

  it('설명이 없으면 이름으로 대신한다 — CLI 는 설명으로 사람을 고른다', () => {
    expect(peopleSpec([person({ description: '' })]).scout?.description).toBe('scout')
  })

  it('지시가 없는 사람은 싣지 않는다 — 실려도 CLI 가 버린다', () => {
    expect(peopleSpec([person({ prompt: '   ' })])).toEqual({})
  })
})

describe('agentsArgs — 잠금은 세션 주 에이전트로 표현된다', () => {
  it('잠그지 않으면 사람만 싣고 주 에이전트는 건드리지 않는다', () => {
    const args = agentsArgs([person()], null, boss)
    expect(args[0]).toBe('--agents')
    expect(args).not.toContain('--agent')
    expect(JSON.parse(args[1] as string)).not.toHaveProperty(ORCHESTRATOR)
  })

  it('잠그면 우리 오케스트레이터를 세우고 부를 사람을 좁힌다', () => {
    const args = agentsArgs([person(), person({ name: 'reviewer' })], { knownTools: ['Read', 'Task'], alsoCallable: [] }, boss)
    const spec = JSON.parse(args[1] as string)
    expect(spec[ORCHESTRATOR].tools).toEqual(['Read', 'Agent(scout, reviewer)'])
    expect(spec[ORCHESTRATOR].prompt).toBe(boss)
    expect(args.slice(2)).toEqual(['--agent', ORCHESTRATOR])
  })

  it('아는 도구가 없으면 잠그지 않는다 — 잠그면 도구를 전부 잃는다', () => {
    const args = agentsArgs([person()], { knownTools: [], alsoCallable: [] }, boss)
    expect(args).not.toContain('--agent')
  })

  it('들인 사람이 없으면 아무 인자도 넘기지 않는다', () => {
    expect(agentsArgs([], { knownTools: ['Read'], alsoCallable: [] }, boss)).toEqual([])
  })
})
