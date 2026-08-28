import { describe, expect, it } from 'vitest'
import { contextPercent, gauges, reachable } from './format'
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

describe('the gauges in the status bar', () => {
  it('shows no gauge while nothing is known, rather than making an empty one', () => {
    expect(gauges(state())).toEqual([])
  })

  it('shows the chat as a gauge once it has used anything', () => {
    expect(contextPercent({ used: 100_000, window: 1_000_000 })).toBe(10)
    const [chat] = gauges(state({ context: { used: 100_000, window: 1_000_000 } }))
    expect(chat).toEqual({
      key: 'chat',
      label: 'this chat',
      value: '10%',
      percent: 10,
      warn: false,
      hint: null,
    })
  })

  it('turns the same gauge into a warning once the chat is close to being compacted', () => {
    const all = gauges(state({ context: { used: 880_000, window: 1_000_000 } }))
    expect(all).toHaveLength(1)
    expect(all[0]).toEqual({
      key: 'chat',
      label: 'compacting soon',
      value: '88%',
      percent: 88,
      warn: true,
      hint: null,
    })
  })

  it('falls back to a token count with no fill while the window size is unknown', () => {
    expect(contextPercent({ used: 28364, window: null })).toBeNull()
    const [chat] = gauges(state({ context: { used: 28364, window: null } }))
    expect(chat).toMatchObject({
      key: 'chat',
      label: 'this chat',
      value: '28.4k',
      percent: null,
      warn: false,
    })
  })

  it('does not repeat the money the sidebar already shows', () => {
    const found = gauges(state({ cost: { ...state().cost, usd: 0.19338 } })).find(
      (c) => c.key === ('cost' as never),
    )
    expect(found).toBeUndefined()
  })

  it('leaves the account limits to the marks along the left', () => {
    const held = gauges(
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
    expect(held.find((c) => c.key === ('limit' as never))).toBeUndefined()
  })

  it('fills the MCP gauge by connected share and warns when some need signing in', () => {
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
    const found = gauges(state({ session })).find((c) => c.key === 'mcp')
    expect(found).toEqual({
      key: 'mcp',
      label: 'MCP',
      value: '2/4',
      percent: 50,
      warn: true,
      hint: '1 need auth',
    })
  })

  it('keeps the MCP gauge quiet when everyone is signed in', () => {
    const session = {
      ...state().session,
      mcp: [{ name: 'a', status: 'connected' }],
    }
    const found = gauges(state({ session: session as never })).find((c) => c.key === 'mcp')
    expect(found).toMatchObject({
      value: '1/1',
      percent: 100,
      warn: false,
      hint: null,
    })
  })

  it('makes no MCP gauge when there are none', () => {
    const session = { ...state().session, mcp: [] }
    expect(
      gauges(state({ session: session as never })).find((c) => c.key === 'mcp'),
    ).toBeUndefined()
  })

  it('mentions the CLI only when there is a newer one', () => {
    const calm = gauges(
      state({
        update: {
          current: '2.1.231',
          latest: '2.1.231',
          managedBy: 'Homebrew',
        },
      }),
    )
    expect(calm.find((c) => c.key === 'update')).toBeUndefined()

    const stale = gauges(
      state({
        update: {
          current: '2.1.231',
          latest: '2.1.240',
          managedBy: 'Homebrew',
        },
      }),
    )
    expect(stale.find((c) => c.key === 'update')).toEqual({
      key: 'update',
      label: 'Update CLI',
      value: '',
      percent: null,
      warn: true,
      hint: '2.1.231 → 2.1.240',
    })
  })

  it('does not read an older latest as an update', () => {
    const downgrade = gauges(
      state({
        update: {
          current: '2.1.231',
          latest: '2.1.200',
          managedBy: 'Homebrew',
        },
      }),
    )
    expect(downgrade.find((c) => c.key === 'update')).toBeUndefined()
  })

  it('keeps the gauges in a fixed order, so the row does not shuffle as values arrive', () => {
    const session = {
      ...state().session,
      mcp: [{ name: 'a', status: 'connected' }],
    }
    const full = gauges(
      state({
        context: { used: 900_000, window: 1_000_000 },
        session: session as never,
        update: { current: '2.1.231', latest: '2.1.240', managedBy: null },
      }),
    )
    expect(full.map((c) => c.key)).toEqual(['chat', 'mcp', 'update'])
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
    const honest = withMcp([
      { name: 'claude.ai Notion', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const [mcp] = gauges(honest, [
      {
        name: 'claude.ai Notion',
        where: 'https://mcp.notion.com/mcp',
        state: 'connected',
      },
      {
        name: 'playwright',
        where: 'npx @playwright/mcp@latest',
        state: 'connected',
      },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.value).toBe('1/2')
    expect(mcp?.hint).toBe('1 need auth')
    expect(mcp?.warn).toBe(true)
  })

  it('still reports trouble the health check itself found', () => {
    const [mcp] = gauges(withMcp([{ name: 'claude.ai Slack', status: 'connected' }]), [
      {
        name: 'claude.ai Slack',
        where: 'https://mcp.slack.com/mcp',
        state: 'needs-auth',
      },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.value).toBe('0/1')
    expect(mcp?.warn).toBe(true)
    expect(mcp?.warn).toBe(true)
  })

  it('falls back to the snapshot until the check has come back', () => {
    const stale = withMcp([
      { name: 'claude.ai Notion', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const [mcp] = gauges(stale, []).filter((cell) => cell.key === 'mcp')
    expect(mcp?.value).toBe('1/2')
    expect(mcp?.hint).toBe('1 need auth')
  })

  it('says nothing at all until the health check has come back', () => {
    const stale = withMcp([
      { name: 'claude.ai Gmail', status: 'needs-auth' },
      { name: 'playwright', status: 'connected' },
    ])
    const keys = gauges(stale, [], false).map((cell) => cell.key)
    expect(keys, 'three seconds of false warning on every launch is not on').not.toContain('mcp')
  })

  it('still says the things that do not wait on the health check', () => {
    const tight = state({
      context: { used: 950_000, window: 1_000_000 },
      update: { current: '2.1.231', latest: '2.1.240', managedBy: null },
    })
    expect(gauges(tight, [], false).map((cell) => cell.key)).toEqual(['chat', 'update'])
  })

  it('keeps a server the health check never mentioned, rather than losing it', () => {
    const [mcp] = gauges(withMcp([{ name: 'only-in-session', status: 'connected' }]), [
      {
        name: 'claude.ai Slack',
        where: 'https://mcp.slack.com/mcp',
        state: 'connected',
      },
    ]).filter((cell) => cell.key === 'mcp')
    expect(mcp?.value).toBe('2/2')
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
    const cell = gauges(
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
    expect(cell?.value).toBe('2/3')
    expect(cell?.hint).toBe('1 need auth')
    expect(cell?.warn).toBe(true)
  })

  it('falls back to the config while no session has started', () => {
    const cell = gauges(state(), [
      { name: 'Gmail', where: 'x', state: 'connected' },
      { name: 'Slack', where: 'y', state: 'needs-auth' },
    ]).find((one) => one.key === 'mcp')
    expect(cell?.value).toBe('1/2')
    expect(cell?.hint).toBe('1 need auth')
  })
})
