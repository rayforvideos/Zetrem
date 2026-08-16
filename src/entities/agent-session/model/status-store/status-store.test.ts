import { beforeEach, describe, expect, it } from 'vitest'
import { statusStore } from './status-store'

beforeEach(() => {
  statusStore.reset()
})

const session = {
  id: 's1', cwd: '/w', model: 'claude-opus-5[1m]', permissionMode: 'acceptEdits',
  outputStyle: 'default', cliVersion: '2.1.231', apiKeySource: 'none',
  fastMode: { state: 'off', reason: 'sdk_opt_in_required' },
  mcp: [{ name: 'playwright', status: 'connected' }],
  tools: [],
    agents: [],
  counts: { tools: 3, commands: 2, agents: 1, skills: 1, plugins: 1 },
  memoryPaths: [],
}

function metrics(costUsd: number, contextWindow: number | null = 1_000_000) {
  return {
    costUsd,
    tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
    durationMs: 10485, ttftMs: 2352, turns: 3,
    contextWindow, apiErrorStatus: null, stopReason: 'end_turn',
  }
}

describe('statusStore: the last thing known to be true', () => {
  it('says it does not know before it has heard anything, so the screen cannot invent', () => {
    const state = statusStore.get()
    expect(state.session).toBeNull()
    expect(state.limits).toEqual([])
    expect(state.update).toBeNull()
    expect(state.context).toEqual({ used: 0, window: null })
  })

  it('fills in who this session is from init', () => {
    statusStore.apply({ type: 'session', session })
    expect(statusStore.get().session?.cliVersion).toBe('2.1.231')
  })

  it('overwrites context with the latest value, because it is a size and not a total', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    statusStore.apply({ type: 'context', used: 31059 })
    expect(statusStore.get().context.used).toBe(31059)
  })

  it('has no denominator until a result gives one', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    expect(statusStore.get().context.window).toBeNull()
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('keeps a known denominator when a result comes without one', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1, 1_000_000) })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.2, null) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('holds the session total and this turn separately', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.125331) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.125331, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.125331, 6)

    statusStore.apply({ type: 'metrics', metrics: metrics(0.166547) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.166547, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.041216, 6)
  })

  it('holds the latest limit warning', () => {
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })
    expect(statusStore.get().limits[0]?.utilization).toBe(0.28)
  })

  it('keeps a five hour and a weekly limit side by side, since one does not replace the other', () => {
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.5, resetsAtMs: 1787173200000, overage: false, status: 'allowed' },
    })
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'five_hour', utilization: 0.1, resetsAtMs: 1787000000000, overage: false, status: 'allowed' },
    })
    expect(statusStore.get().limits.map((limit) => limit.kind)).toEqual(['five_hour', 'seven_day'])
  })

  it('replaces a limit of the same kind rather than stacking it', () => {
    for (const utilization of [0.2, 0.4]) {
      statusStore.apply({
        type: 'limit',
        limit: { kind: 'seven_day', utilization, resetsAtMs: 1787173200000, overage: false, status: 'allowed' },
      })
    }
    expect(statusStore.get().limits).toHaveLength(1)
    expect(statusStore.get().limits[0]?.utilization).toBe(0.4)
  })

  it('joins the start and end of a hook by its id', () => {
    statusStore.apply({ type: 'hookStarted', hookId: 'c3d7', name: 'SessionStart:startup', event: 'SessionStart' })
    expect(statusStore.get().hooks).toHaveLength(0)
    statusStore.apply({ type: 'hookDone', hookId: 'c3d7', exitCode: 0, stderr: '' })
    const [hook] = statusStore.get().hooks
    expect(hook).toMatchObject({ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0 })
    expect(typeof hook!.ms).toBe('number')
  })

  it('drops an unpaired hook end, rather than showing a row with no name', () => {
    statusStore.apply({ type: 'hookDone', hookId: 'none', exitCode: 1, stderr: 'x' })
    expect(statusStore.get().hooks).toEqual([])
  })

  it('keeps the last five hooks, so the drawer is not a hook log', () => {
    for (let i = 0; i < 7; i += 1) {
      statusStore.apply({ type: 'hookStarted', hookId: `h${i}`, name: `훅${i}`, event: 'PreToolUse' })
      statusStore.apply({ type: 'hookDone', hookId: `h${i}`, exitCode: 0, stderr: '' })
    }
    const hooks = statusStore.get().hooks
    expect(hooks).toHaveLength(5)
    expect(hooks[0]!.name).toBe('훅6')
  })

  it('holds what is in progress', () => {
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(statusStore.get().activity).toBe('requesting')
  })

  it('takes update news from us, not from the CLI', () => {
    statusStore.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
    expect(statusStore.get().update).toEqual({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
  })

  it('clears pending hooks on reset, so an old session cannot report into a new one', () => {
    statusStore.apply({ type: 'hookStarted', hookId: 'x', name: 'n', event: 'e' })
    statusStore.reset()
    statusStore.apply({ type: 'hookDone', hookId: 'x', exitCode: 0, stderr: '' })
    expect(statusStore.get().hooks).toEqual([])
  })

  it('lets go of everything from the last session, or the new one measures against the old cost', () => {
    statusStore.apply({ type: 'session', session })
    statusStore.apply({ type: 'context', used: 28364 })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.9) })
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })

    statusStore.reset()
    expect(statusStore.get().session).toBeNull()
    expect(statusStore.get().context).toEqual({ used: 0, window: null })
    expect(statusStore.get().cost.usd).toBe(0)
    expect(statusStore.get().limits).toEqual([])

    statusStore.apply({ type: 'metrics', metrics: metrics(0.02) })
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.02, 6)
  })

  it('keeps the CLI version through a reset, because that is a fact about the install', () => {
    statusStore.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'npm' })
    statusStore.reset()
    expect(statusStore.get().update).toEqual({ current: '2.1.231', latest: '2.1.240', managedBy: 'npm' })
  })

  it('never reports a negative turn cost, even if the total drops', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.2) })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.05) })
    expect(statusStore.get().cost.lastTurnUsd).toBe(0)
  })

  it('says nothing when context has not changed, so the same number is not redrawn every round trip', () => {
    let count = 0
    const stop = statusStore.subscribe(() => { count += 1 })
    statusStore.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    statusStore.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    stop()
  })

  it('tells subscribers about a change and stays quiet when there is none', () => {
    let count = 0
    const stop = statusStore.subscribe(() => { count += 1 })
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1)
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1)
    stop()
    statusStore.apply({ type: 'activity', activity: 'idle' })
    expect(count).toBe(1)
  })
})

describe('restoreChat: reopening a chat brings its totals back', () => {
  it('puts back what the chat had spent', () => {
    statusStore.reset()
    statusStore.restoreChat({
      usd: 0.42,
      turns: 3,
      tokensOut: 1200,
      tokensIn: 8,
      cacheRead: 5000,
      cacheWrite: 900,
      durationMs: 1800,
      contextUsed: 90_000,
      contextWindow: 1_000_000,
    })
    const state = statusStore.get()
    expect(state.cost.usd).toBe(0.42)
    expect(state.cost.turns).toBe(3)
    expect(state.cost.tokens.out).toBe(1200)
    expect(state.context.used).toBe(90_000)
    expect(state.context.window).toBe(1_000_000)
    expect(state.cost.tokens.cacheRead).toBe(5000)
    expect(state.cost.durationMs).toBe(1800)
  })

  it('does nothing for a chat saved before the totals were kept', () => {
    statusStore.reset()
    statusStore.restoreChat(null)
    expect(statusStore.get().cost.usd).toBe(0)
  })

  it('keeps what it has when a field is missing, rather than reading it as zero', () => {
    statusStore.reset()
    statusStore.restoreChat({ usd: 1 })
    expect(statusStore.get().cost.usd).toBe(1)
    expect(statusStore.get().cost.turns).toBe(0)
  })
})
