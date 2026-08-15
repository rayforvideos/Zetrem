import { describe, expect, it } from 'vitest'
import type { Call } from '@/entities/agent-session'
import { currentCall, sceneOf } from './now'

function call(id: string, overrides: Partial<Call> = {}): Call {
  return { id, line: `Read ${id}.ts`, startedAtMs: 0, endedAtMs: 100, failed: false, note: '', ...overrides }
}

describe('currentCall: what the agent has its hands on right now', () => {
  it('finds nothing before any work has started', () => {
    expect(currentCall([])).toBeNull()
  })

  it('picks the call that has not come back yet', () => {
    const open = call('b', { endedAtMs: null })
    expect(currentCall([call('a'), open])?.id).toBe('b')
  })

  it('picks the newest open call, since that is the one they just reached for', () => {
    const first = call('a', { endedAtMs: null })
    const second = call('b', { endedAtMs: null })
    expect(currentCall([first, second])?.id).toBe('b')
  })

  it('falls back to the last thing done when nothing is open', () => {
    expect(currentCall([call('a'), call('b')])?.id).toBe('b')
  })
})

describe('sceneOf: which scene the act calls for', () => {
  it('separates taking a file in from putting one out', () => {
    expect(sceneOf({ kind: 'file', verb: 'read', dir: '', name: 'a.ts' })).toBe('read')
    expect(sceneOf({ kind: 'file', verb: 'edit', dir: '', name: 'a.ts' })).toBe('write')
    expect(sceneOf({ kind: 'file', verb: 'write', dir: '', name: 'a.ts' })).toBe('write')
  })

  it('gives running, searching, fetching and handing off their own scenes', () => {
    expect(sceneOf({ kind: 'command', command: 'npm test' })).toBe('run')
    expect(sceneOf({ kind: 'search', pattern: 'x', scope: '' })).toBe('search')
    expect(sceneOf({ kind: 'web', label: 'anthropic.com' })).toBe('web')
    expect(sceneOf({ kind: 'agent', subagentType: 'Explore', description: '' })).toBe('summon')
  })

  it('falls back to thinking for an act it has no picture of', () => {
    expect(sceneOf({ kind: 'todo' })).toBe('think')
    expect(sceneOf({ kind: 'plain', name: 'Whatever' })).toBe('think')
  })
})
