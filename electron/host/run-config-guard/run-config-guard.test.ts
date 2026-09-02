import { describe, expect, it } from 'vitest'
import { runConfigOf } from './run-config-guard'

const sound = {
  permissionMode: 'ask',
  model: 'default',
  effort: 'default',
  persona: 'ignored here',
  resume: null,
  people: [{ name: 'a', description: 'b', prompt: 'c', model: null, tools: [], isolated: true }],
  lock: null,
}

describe('runConfigOf', () => {
  it('passes a config the renderer is allowed to send', () => {
    expect(runConfigOf(sound)).toEqual({
      permissionMode: 'ask',
      model: 'default',
      effort: 'default',
      resume: null,
      people: sound.people,
      lock: null,
    })
  })

  it('takes every permission mode the CLI knows and nothing else', () => {
    for (const permissionMode of ['ask', 'acceptEdits', 'bypass']) {
      expect(runConfigOf({ ...sound, permissionMode })?.permissionMode).toBe(permissionMode)
    }
    expect(runConfigOf({ ...sound, permissionMode: 'plan' })).toBeNull()
    expect(runConfigOf({ ...sound, permissionMode: '--dangerously-skip-permissions' })).toBeNull()
  })

  it('takes every effort level the CLI knows and nothing else', () => {
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      expect(runConfigOf({ ...sound, effort })?.effort).toBe(effort)
    }
    expect(runConfigOf({ ...sound, effort: 'ultra' })).toBeNull()
    expect(runConfigOf({ ...sound, effort: undefined })).toBeNull()
  })

  it('refuses a model name it has not heard of, since it becomes an argument', () => {
    expect(runConfigOf({ ...sound, model: '--help' })).toBeNull()
  })

  it('refuses a resume that is not a session id string', () => {
    expect(runConfigOf({ ...sound, resume: 7 })).toBeNull()
    expect(runConfigOf({ ...sound, resume: undefined })?.resume).toBeNull()
  })

  it("keeps each person's own worktree answer, which main reads to brief the orchestrator", () => {
    const people = [
      { name: 'a', description: 'b', prompt: 'c', model: null, tools: [], isolated: false },
    ]
    expect(runConfigOf({ ...sound, people })?.people[0]).toHaveProperty('isolated', false)
  })

  it('refuses a person whose worktree answer is not a boolean, since it decides a fence', () => {
    const half = [{ name: 'a', description: 'b', prompt: 'c', model: null, tools: [] }]
    expect(runConfigOf({ ...sound, people: half })).toBeNull()
    expect(runConfigOf({ ...sound, people: [{ ...half[0], isolated: 'yes' }] })).toBeNull()
  })

  it('reads the roster and the lock by shape', () => {
    expect(runConfigOf({ ...sound, people: [{ name: 'a' }] })).toBeNull()
    expect(runConfigOf({ ...sound, lock: { blockedAgents: [1] } })).toBeNull()
    expect(runConfigOf({ ...sound, lock: { blockedAgents: ['x'] } })?.lock).toEqual({
      blockedAgents: ['x'],
    })
  })

  it('never takes the worktree fence off the wire, since main alone decides it', () => {
    expect(
      runConfigOf({ ...sound, isolated: true }),
      'a renderer that could ask for isolation could also ask for none',
    ).not.toHaveProperty('isolated')
    expect(runConfigOf({ ...sound, isolated: 'yes' })).not.toBeNull()
  })

  it('refuses what is not an object at all', () => {
    expect(runConfigOf(null)).toBeNull()
    expect(runConfigOf('bypass')).toBeNull()
  })
})
