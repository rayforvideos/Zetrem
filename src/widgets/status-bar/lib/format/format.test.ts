import { describe, expect, it } from 'vitest'
import { cells, contextPercent } from './format'
import type { StatusState } from '@/entities/agent-session'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    usage: 'read',
    session: null,
    context: { used: 0, window: null },
    cost: { usd: 0, lastTurnUsd: 0, tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 }, durationMs: 0, ttftMs: null, turns: 0 },
    limits: [],
    hooks: [],
    update: null,
    activity: 'idle',
    ...overrides,
  }
}

describe('the cells in the status bar', () => {
  it('shows no cell while nothing is known, rather than making an empty one', () => {
    expect(cells(state())).toEqual([])
  })

  it('leaves a comfortable context alone, since the sidebar already carries the level', () => {
    expect(contextPercent({ used: 100_000, window: 1_000_000 })).toBe(10)
    expect(cells(state({ context: { used: 100_000, window: 1_000_000 } }))).toEqual([])
  })

  it('speaks up once the chat is close to being compacted', () => {
    const [cell] = cells(state({ context: { used: 880_000, window: 1_000_000 } }))
    expect(cell).toEqual({ key: 'context', text: 'Context 12% left, compacting soon', warn: true })
  })

  it('says nothing about context while the window size is unknown', () => {
    expect(contextPercent({ used: 28364, window: null })).toBeNull()
    expect(cells(state({ context: { used: 28364, window: null } }))).toEqual([])
  })

  it('does not repeat the money the sidebar already shows', () => {
    const found = cells(state({ cost: { ...state().cost, usd: 0.19338 } })).find((c) => c.key === 'cost')
    expect(found).toBeUndefined()
  })

  it('leaves the account limits to the bar along the foot of the window', () => {
    const held = cells(state({ limits: [{ kind: 'seven_day', utilization: 0.91, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' }] }))
    expect(held.find((c) => c.key === 'limit')).toBeUndefined()
  })

  it('counts connected MCP servers and grows when some need signing in', () => {
    const session = {
      id: 's', cwd: '/w', model: 'm', permissionMode: 'ask', outputStyle: 'default',
      cliVersion: '2.1.231', apiKeySource: 'none', fastMode: { state: 'off', reason: null },
      tools: [],
    agents: [],
    counts: { tools: 0, commands: 0, agents: 0, skills: 0, plugins: 0 }, memoryPaths: [],
      mcp: [
        { name: 'a', status: 'connected' }, { name: 'b', status: 'connected' },
        { name: 'c', status: 'needs-auth' }, { name: 'd', status: 'pending' },
      ],
    }
    const found = cells(state({ session })).find((c) => c.key === 'mcp')
    expect(found).toEqual({ key: 'mcp', text: 'MCP 2/4 · 1 need auth', warn: true })
  })

  it('makes no MCP cell when there are none', () => {
    const session = { ...state().session, mcp: [] }
    expect(cells(state({ session: session as never })).find((c) => c.key === 'mcp')).toBeUndefined()
  })

  it('grows the version cell when there is a newer one', () => {
    const calm = cells(state({ update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' } }))
    expect(calm.find((c) => c.key === 'update')).toEqual({ key: 'update', text: 'CLI 2.1.231', warn: false })

    const stale = cells(state({ update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }))
    expect(stale.find((c) => c.key === 'update')).toEqual({
      key: 'update', text: 'CLI 2.1.231 → 2.1.240 available', warn: true,
    })
  })

  it('does not read an older latest as an update', () => {
    const downgrade = cells(state({ update: { current: '2.1.231', latest: '2.1.200', managedBy: 'Homebrew' } }))
    expect(downgrade.find((c) => c.key === 'update')).toEqual({
      key: 'update', text: 'CLI 2.1.231', warn: false,
    })
  })

  it('keeps the cells in a fixed order, so the row does not shuffle as values arrive', () => {
    const session = { ...state().session, mcp: [{ name: 'a', status: 'connected' }] }
    const full = cells(state({
      context: { used: 900_000, window: 1_000_000 },
      session: session as never,
      update: { current: '2.1.231', latest: '2.1.231', managedBy: null },
    }))
    expect(full.map((c) => c.key)).toEqual(['context', 'mcp', 'update'])
  })
})
