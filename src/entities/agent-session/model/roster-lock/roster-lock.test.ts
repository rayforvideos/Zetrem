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

  it('still locks when nobody was hired, since an empty roster is a decision too', () => {
    const args = agentsArgs([], { knownTools: ['Read'], alsoCallable: [] }, boss)
    expect(args).toContain('--agent')
  })
})

describe('an empty roster means nobody is callable, not everybody', () => {
  const lock = { knownTools: ['Read', 'Bash', 'Task'], alsoCallable: [] }

  it('still locks the session when nobody has been hired and none are switched on', () => {
    const args = agentsArgs([], lock, boss)
    expect(args).toContain('--agent')
    expect(args[args.indexOf('--agent') + 1]).toBe(ORCHESTRATOR)
  })

  it('hands the orchestrator no way to call anyone, rather than leaving the door open', () => {
    const args = agentsArgs([], lock, boss)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] ?? '{}')
    const tools: string[] = spec[ORCHESTRATOR]?.tools ?? []
    expect(tools).not.toContain('Task')
    expect(tools.some((name) => name.startsWith('Agent('))).toBe(false)
    expect(tools).toContain('Read')
  })

  it('opens the door again for the stock agents that are switched on', () => {
    const args = agentsArgs([], { ...lock, alsoCallable: ['Explore'] }, boss)
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] ?? '{}')
    expect(spec[ORCHESTRATOR]?.tools).toContain('Agent(Explore)')
  })

  it('leaves the session alone while the tools are still unknown', () => {
    expect(agentsArgs([], { knownTools: [], alsoCallable: [] }, boss)).toEqual([])
  })
})

describe('the orchestrator is given no way to work off screen', () => {
  const lock = {
    knownTools: [
      'Read',
      'Bash',
      'Task',
      'Workflow',
      'SendMessage',
      'ListAgents',
      'CronCreate',
      'ScheduleWakeup',
      'RemoteTrigger',
      'WebSearch',
    ],
    alsoCallable: [],
  }

  function toolsOf(args: string[]): string[] {
    const spec = JSON.parse(args[args.indexOf('--agents') + 1] ?? '{}')
    return spec[ORCHESTRATOR]?.tools ?? []
  }

  it('keeps the tools that do the work in front of you', () => {
    const tools = toolsOf(agentsArgs([person()], lock, boss))
    expect(tools).toEqual(expect.arrayContaining(['Read', 'Bash', 'WebSearch']))
  })

  it('takes away the ones that hand work to something the app cannot show', () => {
    const tools = toolsOf(agentsArgs([person()], lock, boss))
    for (const name of ['Workflow', 'SendMessage', 'ListAgents', 'RemoteTrigger']) {
      expect(tools, name).not.toContain(name)
    }
  })

  it('takes away the ones that put work on a clock nobody is watching', () => {
    const tools = toolsOf(agentsArgs([person()], lock, boss))
    expect(tools).not.toContain('CronCreate')
    expect(tools).not.toContain('ScheduleWakeup')
  })

  it('still sends out the crew, which is the way work is meant to be handed on', () => {
    expect(toolsOf(agentsArgs([person()], lock, boss))).toContain('Agent(scout)')
  })
})
