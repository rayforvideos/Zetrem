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

describe('peopleSpec: handing the people we hired to the session', () => {
  it('carries the name, description, brief and model as they are', () => {
    expect(peopleSpec([person()])).toEqual({
      scout: { description: '찾아본다', prompt: '당신은 찾습니다.', model: 'haiku' },
    })
  })

  it('leaves the model out for someone with none, rather than inventing one', () => {
    expect(peopleSpec([person({ model: null })]).scout).not.toHaveProperty('model')
  })

  it('falls back to the name as the description, which is what the CLI chooses on', () => {
    expect(peopleSpec([person({ description: '' })]).scout?.description).toBe('scout')
  })

  it('leaves out someone with no brief, since the CLI would drop them anyway', () => {
    expect(peopleSpec([person({ prompt: '   ' })])).toEqual({})
  })
})

describe('agentsArgs: the lock is expressed as the session main agent', () => {
  it('sends the people and leaves the main agent alone when not locking', () => {
    const args = agentsArgs([person()], null, boss)
    expect(args[0]).toBe('--agents')
    expect(args).not.toContain('--agent')
    expect(JSON.parse(args[1] as string)).not.toHaveProperty(ORCHESTRATOR)
  })

  it('stands up our orchestrator and narrows who it may call', () => {
    const args = agentsArgs([person(), person({ name: 'reviewer' })], { knownTools: ['Read', 'Task'], alsoCallable: [] }, boss)
    const spec = JSON.parse(args[1] as string)
    expect(spec[ORCHESTRATOR].tools).toEqual(['Read', 'Agent(scout, reviewer)'])
    expect(spec[ORCHESTRATOR].prompt).toBe(boss)
    expect(args.slice(2)).toEqual(['--agent', ORCHESTRATOR])
  })

  it('does not lock without a known tool list, because locking would take every tool away', () => {
    const args = agentsArgs([person()], { knownTools: [], alsoCallable: [] }, boss)
    expect(args).not.toContain('--agent')
  })

  it('passes nothing when nobody was hired', () => {
    expect(agentsArgs([], { knownTools: ['Read'], alsoCallable: [] }, boss)).toEqual([])
  })
})
