import { describe, expect, it } from 'vitest'
import { cells, contextPercent, reachable } from './format'
import type { StatusState } from '@/entities/agent-session'

function state(overrides: Partial<StatusState> = {}): StatusState {
  return {
    usage: 'read',
    session: null,
    probed: false,
    context: { used: 0, window: null },
    cost: {
      usd: 0,
      lastTurnUsd: 0,
      tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
      durationMs: 0,
      turns: 0,
    },
    limits: [],
    update: null,
    activity: 'idle',
    ...overrides,
    usageAtMs: overrides.usageAtMs ?? null,
  }
}

describe('what counts as reachable', () => {
  it('believes the session over the health check about who needs signing in', () => {
    // The health check probes the transport, so a server handing out nothing
    // but an authenticate tool still reads as connected there. The session
    // sat through init and knows better.
    const withSession = state({
      session: {
        id: 's1',
        cwd: '/w',
        model: 'claude-opus-5',
        permissionMode: 'default',
        cliVersion: '2.1.231',
        mcp: [{ name: 'claude.ai Gmail', status: 'needs-auth' }],
        tools: [],
        agents: [],
      },
    })
    const merged = reachable(withSession, [
      {
        name: 'claude.ai Gmail',
        where: 'https://gmailmcp.googleapis.com/mcp/v1',
        state: 'connected',
      },
    ])
    expect(merged.get('claude.ai Gmail')).toBe('needs-auth')
  })
})

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
    const found = cells(state({ cost: { ...state().cost, usd: 0.19338 } })).find(
      (c) => c.key === 'cost',
    )
    expect(found).toBeUndefined()
  })

  it('leaves the account limits to the bar along the foot of the window', () => {
    const held = cells(
      state({
        limits: [
          {
            kind: 'seven_day',
            utilization: 0.91,
            resetsAtMs: 1787173200000,
            overage: false,
            status: 'allowed_warning',
          },
        ],
      }),
    )
    expect(held.find((c) => c.key === 'limit')).toBeUndefined()
  })

  it('counts connected MCP servers and grows when some need signing in', () => {
    const session = {
      id: 's',
      cwd: '/w',
      model: 'm',
      permissionMode: 'ask',
      cliVersion: '2.1.231',
      tools: [],
      agents: [],

      mcp: [
        { name: 'a', status: 'connected' },
        { name: 'b', status: 'connected' },
        { name: 'c', status: 'needs-auth' },
        { name: 'd', status: 'pending' },
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
    const calm = cells(
      state({ update: { current: '2.1.231', latest: '2.1.231', managedBy: 'Homebrew' } }),
    )
    expect(calm.find((c) => c.key === 'update')).toEqual({
      key: 'update',
      text: 'CLI 2.1.231',
      warn: false,
    })

    const stale = cells(
      state({ update: { current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' } }),
    )
    expect(stale.find((c) => c.key === 'update')).toEqual({
      key: 'update',
      text: 'CLI 2.1.231 → 2.1.240 available',
      warn: true,
    })
  })

  it('does not read an older latest as an update', () => {
    const downgrade = cells(
      state({ update: { current: '2.1.231', latest: '2.1.200', managedBy: 'Homebrew' } }),
    )
    expect(downgrade.find((c) => c.key === 'update')).toEqual({
      key: 'update',
      text: 'CLI 2.1.231',
      warn: false,
    })
  })

  it('keeps the cells in a fixed order, so the row does not shuffle as values arrive', () => {
    const session = { ...state().session, mcp: [{ name: 'a', status: 'connected' }] }
    const full = cells(
      state({
        context: { used: 900_000, window: 1_000_000 },
        session: session as never,
        update: { current: '2.1.231', latest: '2.1.231', managedBy: null },
      }),
    )
    expect(full.map((c) => c.key)).toEqual(['context', 'mcp', 'update'])
  })
})

function withMcp(mcp: { name: string; status: string }[]): StatusState {
  const session = {
    id: 's',
    cwd: '/w',
    model: 'm',
    permissionMode: 'ask',
    cliVersion: '2.1.231',
    tools: [],
    agents: [],

    mcp,
  }
  return state({ session: session as never })
}

describe('the strip counts what this session can actually reach', () => {
  it('believes the session about who needs signing in, however alive the check found them', () => {
    // The check probes the transport, and a server that answers while handing
    // out nothing but an authenticate tool still reads as connected there.
    // The session sat through init: needs-auth there means this session
    // really cannot use the tools, until it is signed in and restarted.
    const honest = withMcp([
      { name: 'claude.ai Notion', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const [mcp] = cells(honest, [
      { name: 'claude.ai Notion', where: 'https://mcp.notion.com/mcp', state: 'connected' },
      { name: 'playwright', where: 'npx @playwright/mcp@latest', state: 'connected' },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.text).toBe('MCP 1/2 · 1 need auth')
    expect(mcp?.warn).toBe(true)
  })

  it('still reports trouble the health check itself found', () => {
    const [mcp] = cells(withMcp([{ name: 'claude.ai Slack', status: 'connected' }]), [
      { name: 'claude.ai Slack', where: 'https://mcp.slack.com/mcp', state: 'needs-auth' },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.text).toBe('MCP 0/1 · 1 need auth')
    expect(mcp?.warn).toBe(true)
  })

  it('falls back to the snapshot until the check has come back', () => {
    const stale = withMcp([
      { name: 'claude.ai Notion', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const [mcp] = cells(stale, []).filter((cell) => cell.key === 'mcp')
    expect(mcp?.text).toBe('MCP 1/2 · 1 need auth')
  })

  it('says nothing at all until the health check has come back', () => {
    const stale = withMcp([
      { name: 'claude.ai Gmail', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const keys = cells(stale, [], false).map((cell) => cell.key)
    expect(keys, 'three seconds of false warning on every launch is not on').not.toContain('mcp')
  })

  it('still says the things that do not wait on the health check', () => {
    const tight = state({
      context: { used: 950_000, window: 1_000_000 },
      update: { current: '2.1.231', latest: '2.1.231', managedBy: null },
    })
    expect(cells(tight, [], false).map((cell) => cell.key)).toEqual(['context', 'update'])
  })

  it('keeps a server the health check never mentioned, rather than losing it', () => {
    const [mcp] = cells(withMcp([{ name: 'only-in-session', status: 'connected' }]), [
      { name: 'claude.ai Slack', where: 'https://mcp.slack.com/mcp', state: 'connected' },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.text).toBe('MCP 2/2')
  })
})

describe('the strip reports the freshest reading it has', () => {
  const session = (mcp: { name: string; status: string }[]) =>
    state({
      session: {
        id: 's',
        cwd: '/w',
        model: 'm',
        permissionMode: 'ask',
        cliVersion: '2.0.0',
        mcp,
        tools: [],
        agents: [],
      },
    })

  it('clears a pending connector once the check says it came up, but not one that could not sign in', () => {
    // Init writes pending for a remote server it has not finished reaching,
    // and that snapshot goes stale the moment the check reaches it. Its
    // needs-auth is different: that is a verdict, not a snapshot.
    const cell = cells(
      session([
        { name: 'Gmail', status: 'needs-auth' },
        { name: 'Figma', status: 'pending' },
        { name: 'playwright', status: 'connected' },
      ]),
      [
        { name: 'Gmail', where: 'x', state: 'connected' },
        { name: 'Figma', where: 'y', state: 'connected' },
        { name: 'playwright', where: 'z', state: 'connected' },
      ],
    ).find((one) => one.key === 'mcp')
    expect(cell?.text).toBe('MCP 2/3 · 1 need auth')
    expect(cell?.warn).toBe(true)
  })

  it('falls back to the config while no session has started', () => {
    const cell = cells(state(), [
      { name: 'Gmail', where: 'x', state: 'connected' },
      { name: 'Slack', where: 'y', state: 'needs-auth' },
    ]).find((one) => one.key === 'mcp')
    expect(cell?.text).toBe('MCP 1/2 · 1 need auth')
  })
})
