import { describe, expect, it } from 'vitest'
import { ORCHESTRATOR, agentsArgs, peopleSpec } from './roster-lock'

const boss = '너는 오케스트레이터다'

function person(overrides: Partial<Parameters<typeof peopleSpec>[0][number]> = {}) {
  return {
    name: 'scout',
    description: '찾아본다',
    prompt: '당신은 찾습니다.',
    model: 'haiku' as string | null,
    tools: [] as string[],
    ...overrides,
  }
}

describe('peopleSpec: handing the people we hired to the session', () => {
  it('carries the name, description, brief and model as they are', () => {
    expect(peopleSpec([person()])).toEqual({
      scout: { description: '찾아본다', prompt: '당신은 찾습니다.', model: 'haiku' },
    })
  })

  it('names the tools a person was given, since the session cannot guess the pick', () => {
    expect(peopleSpec([person({ tools: ['Read', 'Glob'] })]).scout).toHaveProperty('tools', [
      'Read',
      'Glob',
    ])
  })

  it('says nothing about tools when none were picked, so they inherit the whole session', () => {
    expect(peopleSpec([person()]).scout, 'name the tools and everything unnamed is lost').not.toHaveProperty(
      'tools',
    )
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

  it('stands up our orchestrator without naming its tools, so it inherits every one the session has', () => {
    const args = agentsArgs([person(), person({ name: 'reviewer' })], { blockedAgents: [] }, boss)
    const spec = JSON.parse(args[1] as string)
    expect(spec[ORCHESTRATOR], 'name the tools and everything unnamed is lost').not.toHaveProperty('tools')
    expect(spec[ORCHESTRATOR].prompt).toBe(boss)
    expect(args[2]).toBe('--agent')
    expect(args[3]).toBe(ORCHESTRATOR)
  })

  it('still locks when nobody was hired, since an empty roster is a decision too', () => {
    const args = agentsArgs([], { blockedAgents: [] }, boss)
    expect(args).toContain('--agent')
  })
})

function barred(args: string[]): string[] {
  const at = args.indexOf('--disallowedTools')
  return at === -1 ? [] : (args[at + 1] ?? '').split(',')
}

describe('who the orchestrator may call is said by subtraction, not by listing every tool', () => {
  it('bars each agent the roster did not open', () => {
    const args = agentsArgs([person()], { blockedAgents: ['Explore', 'Plan'] }, boss)
    expect(barred(args)).toEqual(expect.arrayContaining(['Agent(Explore)', 'Agent(Plan)']))
  })

  it('says nothing about an agent the roster opened', () => {
    const args = agentsArgs([person()], { blockedAgents: ['Plan'] }, boss)
    expect(barred(args)).not.toContain('Agent(Explore)')
    expect(barred(args), 'somebody you hired is always callable').not.toContain('Agent(scout)')
  })

  it('leaves the session alone when there is no lock at all', () => {
    const args = agentsArgs([person()], null, boss)
    expect(args).not.toContain('--agent')
    expect(args).not.toContain('--disallowedTools')
  })

  it('draws nothing when there is neither a lock nor anyone hired', () => {
    expect(agentsArgs([], null, boss)).toEqual([])
  })
})

describe('the orchestrator is given no way to work off screen', () => {
  const lock = { blockedAgents: [] }

  it('takes away the ones that hand work to something the app cannot show', () => {
    const gone = barred(agentsArgs([person()], lock, boss))
    for (const name of ['Workflow', 'ListAgents', 'RemoteTrigger']) {
      expect(gone, name).toContain(name)
    }
  })

  it('leaves SendMessage alone, since the board draws teammate to teammate', () => {
    const gone = barred(agentsArgs([person()], lock, boss))
    expect(gone).not.toContain('SendMessage')
  })

  it('never bars Task, which is the crew tool under its other name', () => {
    const gone = barred(agentsArgs([person()], lock, boss))
    expect(gone, 'barring Task takes the whole Agent tool, and then nobody can be called').not.toContain('Task')
  })

  it('takes away the ones that put work on a clock nobody is watching', () => {
    const gone = barred(agentsArgs([person()], lock, boss))
    expect(gone).toContain('CronCreate')
    expect(gone).toContain('ScheduleWakeup')
  })

  it('leaves the tools that do the work in front of you alone', () => {
    const gone = barred(agentsArgs([person()], lock, boss))
    for (const name of ['Read', 'Bash', 'WebSearch', 'Edit']) {
      expect(gone, name).not.toContain(name)
    }
  })

  it('never bars the crew tool itself, which is how work is meant to be handed on', () => {
    expect(barred(agentsArgs([person()], lock, boss))).not.toContain('Agent')
  })
})
