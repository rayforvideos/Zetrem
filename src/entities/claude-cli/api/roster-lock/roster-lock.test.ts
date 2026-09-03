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
    isolated: true,
    ...overrides,
  }
}

const NOTICE =
  '\n\nYou work in a git worktree of your own. If a node_modules folder is present there, it is linked from the main checkout: never install, update or remove dependencies inside the worktree.'

describe('peopleSpec: handing the people we hired to the session', () => {
  it('carries the name, description, brief and model as they are', () => {
    expect(peopleSpec([person()], false)).toEqual({
      scout: { description: '찾아본다', prompt: '당신은 찾습니다.', model: 'haiku' },
    })
  })

  it('names the tools a person was given, since the session cannot guess the pick', () => {
    expect(peopleSpec([person({ tools: ['Read', 'Glob'] })], false).scout).toHaveProperty('tools', [
      'Read',
      'Glob',
    ])
  })

  it('says nothing about tools when none were picked, so they inherit the whole session', () => {
    expect(
      peopleSpec([person()], false).scout,
      'name the tools and everything unnamed is lost',
    ).not.toHaveProperty('tools')
  })

  it('leaves the model out for someone with none, rather than inventing one', () => {
    expect(peopleSpec([person({ model: null })], false).scout).not.toHaveProperty('model')
  })

  it('falls back to the name as the description, which is what the CLI chooses on', () => {
    expect(peopleSpec([person({ description: '' })], false).scout?.description).toBe('scout')
  })

  it('leaves out someone with no brief, since the CLI would drop them anyway', () => {
    expect(peopleSpec([person({ prompt: '   ' })], false)).toEqual({})
  })
})

describe('agentsArgs: the lock is expressed as the session main agent', () => {
  it('sends the people and leaves the main agent alone when not locking', () => {
    const args = agentsArgs([person()], null, boss, false)
    expect(args[0]).toBe('--agents')
    expect(args).not.toContain('--agent')
    expect(JSON.parse(args[1] as string)).not.toHaveProperty(ORCHESTRATOR)
  })

  it('stands up our orchestrator without naming its tools, so it inherits every one the session has', () => {
    const args = agentsArgs(
      [person(), person({ name: 'reviewer' })],
      { blockedAgents: [] },
      boss,
      false,
    )
    const spec = JSON.parse(args[1] as string)
    expect(spec[ORCHESTRATOR], 'name the tools and everything unnamed is lost').not.toHaveProperty(
      'tools',
    )
    expect(spec[ORCHESTRATOR].prompt).toBe(boss)
    expect(args[2]).toBe('--agent')
    expect(args[3]).toBe(ORCHESTRATOR)
  })

  it('still locks when nobody was hired, since an empty roster is a decision too', () => {
    const args = agentsArgs([], { blockedAgents: [] }, boss, false)
    expect(args).toContain('--agent')
  })
})

function barred(args: string[]): string[] {
  const at = args.indexOf('--disallowedTools')
  return at === -1 ? [] : (args[at + 1] ?? '').split(',')
}

describe('who the orchestrator may call is said by subtraction, not by listing every tool', () => {
  it('bars each agent the roster did not open', () => {
    const args = agentsArgs([person()], { blockedAgents: ['Explore', 'Plan'] }, boss, false)
    expect(barred(args)).toEqual(expect.arrayContaining(['Agent(Explore)', 'Agent(Plan)']))
  })

  it('says nothing about an agent the roster opened', () => {
    const args = agentsArgs([person()], { blockedAgents: ['Plan'] }, boss, false)
    expect(barred(args)).not.toContain('Agent(Explore)')
    expect(barred(args), 'somebody you hired is always callable').not.toContain('Agent(scout)')
  })

  it('leaves the session alone when there is no lock at all', () => {
    const args = agentsArgs([person()], null, boss, false)
    expect(args).not.toContain('--agent')
    expect(args).not.toContain('--disallowedTools')
  })

  it('draws nothing when there is neither a lock nor anyone hired', () => {
    expect(agentsArgs([], null, boss, false)).toEqual([])
  })
})

describe('the orchestrator is given no way to work off screen', () => {
  const lock = { blockedAgents: [] }

  it('takes away the ones that hand work to something the app cannot show', () => {
    const gone = barred(agentsArgs([person()], lock, boss, false))
    for (const name of ['Workflow', 'ListAgents', 'RemoteTrigger']) {
      expect(gone, name).toContain(name)
    }
  })

  it('leaves SendMessage alone, since the board draws teammate to teammate', () => {
    const gone = barred(agentsArgs([person()], lock, boss, false))
    expect(gone).not.toContain('SendMessage')
  })

  it('never bars Task, which is the crew tool under its other name', () => {
    const gone = barred(agentsArgs([person()], lock, boss, false))
    expect(
      gone,
      'barring Task takes the whole Agent tool, and then nobody can be called',
    ).not.toContain('Task')
  })

  it('takes away the ones that put work on a clock nobody is watching', () => {
    const gone = barred(agentsArgs([person()], lock, boss, false))
    expect(gone).toContain('CronCreate')
    expect(gone).toContain('ScheduleWakeup')
  })

  it('leaves the tools that do the work in front of you alone', () => {
    const gone = barred(agentsArgs([person()], lock, boss, false))
    for (const name of ['Read', 'Bash', 'WebSearch', 'Edit']) {
      expect(gone, name).not.toContain(name)
    }
  })

  it('never bars the crew tool itself, which is how work is meant to be handed on', () => {
    expect(barred(agentsArgs([person()], lock, boss, false))).not.toContain('Agent')
  })
})

describe('a teammate is fenced into a worktree by the definition itself', () => {
  it('gives every person their own worktree when the workspace can hold one', () => {
    const spec = peopleSpec([person(), person({ name: 'reviewer' })], true)
    expect(spec.scout).toHaveProperty('isolation', 'worktree')
    expect(spec.reviewer).toHaveProperty('isolation', 'worktree')
  })

  it('leaves the orchestrator in the shared tree, which it alone writes to', () => {
    const args = agentsArgs([person()], { blockedAgents: [] }, boss, true)
    const spec = JSON.parse(args[1] as string)
    expect(spec.scout).toHaveProperty('isolation', 'worktree')
    expect(
      spec[ORCHESTRATOR],
      'the one writer of the shared tree is also the one that merges into it',
    ).not.toHaveProperty('isolation')
  })

  it('says nothing about worktrees where nothing could enforce one', () => {
    const spec = peopleSpec([person()], false)
    expect(spec.scout).not.toHaveProperty('isolation')
    const args = agentsArgs([person()], { blockedAgents: [] }, boss, false)
    for (const entry of Object.values(JSON.parse(args[1] as string))) {
      expect(entry).not.toHaveProperty('isolation')
    }
  })

  it('carries the fence through the JSON, which is the only thing the CLI reads', () => {
    const args = agentsArgs([person()], null, boss, true)
    expect(JSON.parse(args[1] as string)).toEqual({
      scout: {
        description: '찾아본다',
        prompt: `당신은 찾습니다.${NOTICE}`,
        model: 'haiku',
        isolation: 'worktree',
      },
    })
  })

  it('tells a fenced teammate not to touch dependencies from inside its worktree', () => {
    const spec = peopleSpec([person()], true)
    expect(spec.scout?.prompt).toContain(NOTICE)
  })

  it('says it as a condition, since a project may have no node_modules to link at all', () => {
    const said = peopleSpec([person()], true).scout?.prompt ?? ''
    expect(said, 'a worktree with nothing linked in would make a flat claim a lie').toContain(
      'If a node_modules folder is present',
    )
    expect(said).not.toContain('shares node_modules')
  })

  it('says nothing about node_modules to a teammate that never gets a worktree', () => {
    const spec = peopleSpec([person()], false)
    expect(spec.scout?.prompt).not.toContain(NOTICE)
  })
})

describe('only a teammate that opted in is fenced, even when the workspace can hold one', () => {
  it('leaves a person marked isolated: false with no isolation at all', () => {
    const spec = peopleSpec([person({ isolated: false })], true)
    expect(spec.scout).not.toHaveProperty('isolation')
  })

  it('leaves their prompt untouched, since they never enter a worktree', () => {
    const spec = peopleSpec([person({ isolated: false })], true)
    expect(spec.scout?.prompt).toBe('당신은 찾습니다.')
  })

  it('still fences a person marked isolated: true beside them', () => {
    const spec = peopleSpec(
      [person({ isolated: false }), person({ name: 'reviewer', isolated: true })],
      true,
    )
    expect(spec.scout).not.toHaveProperty('isolation')
    expect(spec.reviewer).toHaveProperty('isolation', 'worktree')
  })

  it('carries model and tools for an opted-out person exactly as for anyone else', () => {
    const spec = peopleSpec([person({ isolated: false, tools: ['Read'] })], true)
    expect(spec.scout).toEqual({
      description: '찾아본다',
      prompt: '당신은 찾습니다.',
      model: 'haiku',
      tools: ['Read'],
    })
  })
})

describe('the generic helper is fenced too, since it is spawned by name like anyone else', () => {
  const lock = { blockedAgents: [] }
  const generics = ['claude', 'general-purpose']

  function spec(args: string[]) {
    return JSON.parse(args[args.indexOf('--agents') + 1] as string)
  }

  it('defines the built-in helper names, which otherwise come with no fence at all', () => {
    const given = spec(agentsArgs([person()], lock, boss, true))
    for (const name of generics) {
      expect(given[name], name).toHaveProperty('isolation', 'worktree')
      expect(given[name].prompt.trim().length, name).toBeGreaterThan(0)
      expect(given[name].description.trim().length, name).toBeGreaterThan(0)
    }
  })

  it('still leaves the orchestrator in the shared tree it alone writes to', () => {
    const given = spec(agentsArgs([person()], lock, boss, true))
    expect(given[ORCHESTRATOR]).not.toHaveProperty('isolation')
  })

  it('defines neither where nothing could enforce a worktree', () => {
    const given = spec(agentsArgs([person()], lock, boss, false))
    for (const name of generics) expect(given, name).not.toHaveProperty(name)
  })

  it('leaves the built-ins alone when there is no lock, since we are not the main agent then', () => {
    for (const isolated of [true, false]) {
      const given = spec(agentsArgs([person()], null, boss, isolated))
      for (const name of generics) expect(given, name).not.toHaveProperty(name)
    }
  })

  it('gives way to a teammate the user hired under that name, brief and tools intact', () => {
    const mine = person({
      name: 'claude',
      prompt: '내 것',
      tools: ['Read'],
      description: '내 사람',
    })
    const given = spec(agentsArgs([mine], lock, boss, true))
    expect(given.claude).toEqual({
      description: '내 사람',
      prompt: `내 것${NOTICE}`,
      model: 'haiku',
      tools: ['Read'],
      isolation: 'worktree',
    })
  })
})

describe('every teammate is told to speak the language the app is read in', () => {
  const LINE = '모든 말은 한국어로 한다.'

  it('opens each person with the line the screen handed over', () => {
    expect(peopleSpec([person()], true, LINE).scout?.prompt.startsWith(LINE)).toBe(true)
  })

  it('tells the generic helper the same, and leaves the orchestrator to the person', () => {
    const args = agentsArgs([], { blockedAgents: [] }, boss, true, LINE)
    const spec = JSON.parse(args[1] ?? '{}') as Record<string, { prompt: string }>
    expect(spec.claude?.prompt).toContain(LINE)
    expect(spec[ORCHESTRATOR]?.prompt).toBe(boss)
  })

  it('puts the line before the brief and its worktree notice, where it is read first', () => {
    const said = peopleSpec([person()], true, LINE).scout?.prompt ?? ''
    expect(said.indexOf(LINE)).toBeLessThan(said.indexOf(person().prompt))
    expect(said).toContain(NOTICE)
  })

  it('adds nothing when the screen handed over no line', () => {
    expect(peopleSpec([person()], false).scout?.prompt).toBe(person().prompt)
    expect(peopleSpec([person()], false, '').scout?.prompt).toBe(person().prompt)
  })
})
