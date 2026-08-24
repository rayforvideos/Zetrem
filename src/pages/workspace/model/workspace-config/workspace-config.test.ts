import { describe, expect, it } from 'vitest'
import type { AgentDef } from '@/entities/agent-def'
import { DEFAULT_SETTINGS } from '@/entities/agent-session'
import { crewOf, lockOf, peopleOf, pluginSummary } from './workspace-config'

function def(name: string, overrides: Partial<AgentDef> = {}): AgentDef {
  return {
    name,
    description: `${name} does things`,
    model: null,
    character: null,
    tools: [],
    knowledge: [],
    prompt: 'go',
    source: 'user',
    path: `/${name}.md`,
    ...overrides,
  }
}

describe('peopleOf: what the session is told about our team', () => {
  it('carries the name, description, brief and model', () => {
    expect(peopleOf([def('Ray', { model: 'sonnet' })])).toEqual([
      { name: 'Ray', description: 'Ray does things', prompt: 'go', model: 'sonnet', tools: [] },
    ])
  })

  it('sends nobody when nobody was hired', () => {
    expect(peopleOf([])).toEqual([])
  })
})

describe('crewOf: the faces and models the screen draws by', () => {
  it('keys each teammate by name', () => {
    const crew = crewOf([def('Ray', { character: 'jelly', model: 'sonnet' })], 'claude-opus-5')
    expect(crew.members.Ray).toEqual({ character: 'jelly', model: 'sonnet' })
  })

  it('carries the session model as what an unset teammate inherits', () => {
    expect(crewOf([], 'claude-opus-5').fallbackModel).toBe('claude-opus-5')
  })

  it('inherits nothing when the session model is unknown', () => {
    expect(crewOf([], null).fallbackModel).toBe(null)
  })
})

describe('lockOf: who the orchestrator may call', () => {
  const settings = { ...DEFAULT_SETTINGS, knownTools: ['Read', 'Bash'] }

  it('locks from the first run, since the lock no longer costs the session its tools', () => {
    expect(lockOf(DEFAULT_SETTINGS, [def('Ray')]).blockedAgents).toEqual([])
  })

  it('bars the built-in agents that were switched off, and only those', () => {
    const lock = lockOf(
      { ...settings, knownAgents: ['Explore', 'Plan', 'Ray'], stockOff: ['Explore'] },
      [def('Ray')],
    )
    expect(lock.blockedAgents).toEqual(['Explore'])
  })

  it('bars none of theirs while none were switched off', () => {
    // Being one of theirs is enough to be callable now, so an untouched
    // install blocks nothing.
    const lock = lockOf({ ...settings, knownAgents: ['Explore'] }, [def('Ray')])
    expect(lock.blockedAgents).toEqual([])
  })

  it('never bars someone we hired, whose whole point is being callable', () => {
    const lock = lockOf({ ...settings, knownAgents: ['Explore', 'Ray'] }, [def('Ray')])
    expect(lock.blockedAgents).not.toContain('Ray')
  })

  it('never bars the orchestrator seat itself', () => {
    const lock = lockOf({ ...settings, knownAgents: ['zetrem', 'Explore'] }, [])
    expect(lock.blockedAgents).not.toContain('zetrem')
  })

  it('bars a plugin agent, which has no switch and was never callable', () => {
    const lock = lockOf({ ...settings, knownAgents: ['nx:ci-monitor-subagent'] }, [])
    expect(lock.blockedAgents).toEqual(['nx:ci-monitor-subagent'])
  })

  it('bars nobody before it has heard of any agent', () => {
    expect(lockOf({ ...settings, knownAgents: [] }, []).blockedAgents).toEqual([])
  })
})

describe('pluginSummary: one line about plugins', () => {
  it('counts what is installed and where from', () => {
    expect(pluginSummary(3, 2)).toBe('3 installed from 2 sources')
  })

  it('says source in the singular for one', () => {
    expect(pluginSummary(1, 1)).toBe('1 installed from 1 source')
  })

  it('invites a first marketplace when there is nothing at all', () => {
    expect(pluginSummary(0, 0)).toContain('Add a marketplace')
  })
})

describe('an agent from the person own .claude folder is not zetrem business', () => {
  const wrote = { ...DEFAULT_SETTINGS, knownAgents: ['Explore', 'Ray'], stockOff: ['Explore'] }

  it('bars it, since zetrem carries our own people and the builtins and nothing else', () => {
    expect(lockOf(wrote, [], ['Ray']).blockedAgents).toContain('Ray')
  })

  it('bars the builtin that was switched off', () => {
    expect(lockOf(wrote, [], ['Ray']).blockedAgents).toContain('Explore')
  })

  it('bars it even if a stale setting still names it as switched off', () => {
    const stale = { ...wrote, stockOff: ['Explore', 'Ray'] }
    expect(lockOf(stale, [], ['Ray']).blockedAgents, 'authored elsewhere, so not ours to offer').toContain('Ray')
  })

  it('keeps someone hired in zetrem callable even when a file shares the name', () => {
    const hired = { ...wrote, knownAgents: ['Ray'] }
    expect(lockOf(hired, [def('Ray')], ['Ray']).blockedAgents).not.toContain('Ray')
  })
})

describe('what reaches the session is what the form collected', () => {
  it('carries the tools a teammate was given', () => {
    expect(peopleOf([def('Ray', { tools: ['Read', 'Glob'] })])[0]?.tools).toEqual(['Read', 'Glob'])
  })

  it('puts the reading order in the brief, the only channel --agents leaves for it', () => {
    const brief = peopleOf([def('Ray', { prompt: '보라', knowledge: ['/a.md'] })])[0]?.prompt ?? ''
    expect(brief).toContain('보라')
    expect(brief).toContain('/a.md')
  })

  it('leaves a brief alone when nothing was attached', () => {
    expect(peopleOf([def('Ray', { prompt: '보라' })])[0]?.prompt).toBe('보라')
  })
})
