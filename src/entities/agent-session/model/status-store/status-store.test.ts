import { beforeEach, describe, expect, it } from 'vitest'
import { createChatStatus } from './status-store'

let store = createChatStatus()

beforeEach(() => {
  store = createChatStatus()
})

const session = {
  id: 's1',
  cwd: '/w',
  model: 'claude-opus-5[1m]',
  permissionMode: 'acceptEdits',
  cliVersion: '2.1.231',
  mcp: [{ name: 'playwright', status: 'connected' }],
  tools: [],
  agents: [],
}

function metrics(costUsd: number, contextWindow: number | null = 1_000_000) {
  return {
    costUsd,
    tokens: { in: 6, out: 261, cacheRead: 76424, cacheCreate: 14862 },
    durationMs: 10485,
    turns: 3,
    contextWindow,
    apiErrorStatus: null,
    stopReason: 'end_turn',
  }
}

describe('createChatStatus: the last thing known to be true about a chat', () => {
  it('says it does not know before it has heard anything, so the screen cannot invent', () => {
    const state = store.get()
    expect(state.session).toBeNull()
    expect(state.context).toEqual({ used: 0, window: null })
  })

  it('fills in who this session is from init', () => {
    store.apply({ type: 'session', session })
    expect(store.get().session?.cliVersion).toBe('2.1.231')
  })

  it('overwrites context with the latest value, because it is a size and not a total', () => {
    store.apply({ type: 'context', used: 28364 })
    store.apply({ type: 'context', used: 31059 })
    expect(store.get().context.used).toBe(31059)
  })

  it('has no denominator until a result gives one', () => {
    store.apply({ type: 'context', used: 28364 })
    expect(store.get().context.window).toBeNull()
    store.apply({ type: 'metrics', metrics: metrics(0.1) })
    expect(store.get().context.window).toBe(1_000_000)
  })

  it('keeps a known denominator when a result comes without one', () => {
    store.apply({ type: 'metrics', metrics: metrics(0.1, 1_000_000) })
    store.apply({ type: 'metrics', metrics: metrics(0.2, null) })
    expect(store.get().context.window).toBe(1_000_000)
  })

  it('holds the session total and this turn separately', () => {
    store.apply({ type: 'metrics', metrics: metrics(0.125331) })
    expect(store.get().cost.usd).toBeCloseTo(0.125331, 6)
    expect(store.get().cost.lastTurnUsd).toBeCloseTo(0.125331, 6)

    store.apply({ type: 'metrics', metrics: metrics(0.166547) })
    expect(store.get().cost.usd).toBeCloseTo(0.166547, 6)
    expect(store.get().cost.lastTurnUsd).toBeCloseTo(0.041216, 6)
  })

  it('keeps what the chat already cost when the next message resumes it', () => {
    store.restoreChat({ usd: 0.58 })
    store.reset(true)
    expect(store.get().cost.usd, 'going on talking cannot make it cheaper').toBe(0.58)
    store.apply({ type: 'metrics', metrics: metrics(0.23) })
    expect(store.get().cost.usd).toBeCloseTo(0.81, 5)
  })

  it('starts a brand new chat from nothing, so the last chat does not follow it', () => {
    store.restoreChat({ usd: 0.58 })
    store.reset()
    expect(store.get().cost.usd).toBe(0)
    store.apply({ type: 'metrics', metrics: metrics(0.23) })
    expect(store.get().cost.usd).toBeCloseTo(0.23, 5)
  })

  it('holds what is in progress', () => {
    store.apply({ type: 'activity', activity: 'requesting' })
    expect(store.get().activity).toBe('requesting')
  })

  it('lets go of everything from the last session, or the new one measures against the old cost', () => {
    store.apply({ type: 'session', session })
    store.apply({ type: 'context', used: 28364 })
    store.apply({ type: 'metrics', metrics: metrics(0.9) })

    store.reset()
    expect(store.get().session).toBeNull()
    expect(store.get().context).toEqual({ used: 0, window: null })
    expect(store.get().cost.usd).toBe(0)

    store.apply({ type: 'metrics', metrics: metrics(0.02) })
    expect(store.get().cost.lastTurnUsd).toBeCloseTo(0.02, 6)
  })

  it('never reports a negative turn cost, even if the total drops', () => {
    store.apply({ type: 'metrics', metrics: metrics(0.2) })
    store.apply({ type: 'metrics', metrics: metrics(0.05) })
    expect(store.get().cost.lastTurnUsd).toBe(0)
  })

  it('says nothing when context has not changed, so the same number is not redrawn every round trip', () => {
    let count = 0
    const stop = store.subscribe(() => {
      count += 1
    })
    store.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    store.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    stop()
  })

  it('tells subscribers about a change and stays quiet when there is none', () => {
    let count = 0
    const stop = store.subscribe(() => {
      count += 1
    })
    store.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1)
    store.apply({ type: 'activity', activity: 'requesting' })
    expect(count).toBe(1)
    stop()
    store.apply({ type: 'activity', activity: 'idle' })
    expect(count).toBe(1)
  })
})

describe('forgetSession: the session on hand belonged to one account', () => {
  it('drops what the probe learned, so the next probe is believed', () => {
    store.learnProbe(session)
    expect(store.get().probed).toBe(true)

    store.forgetSession()

    expect(store.get().session).toBeNull()
    expect(store.get().probed).toBe(false)
  })

  it('leaves what the account did not decide, so the turn on screen survives', () => {
    store.apply({ type: 'metrics', metrics: metrics(0.4) })
    store.apply({ type: 'session', session })

    store.forgetSession()

    expect(store.get().cost.usd).toBeCloseTo(0.4, 5)
  })
})

describe('restoreChat: reopening a chat brings its totals back', () => {
  it('puts back what the chat had spent', () => {
    store.restoreChat({
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
    const state = store.get()
    expect(state.cost.usd).toBe(0.42)
    expect(state.cost.turns).toBe(3)
    expect(state.cost.tokens.out).toBe(1200)
    expect(state.context.used).toBe(90_000)
    expect(state.context.window).toBe(1_000_000)
    expect(state.cost.tokens.cacheRead).toBe(5000)
    expect(state.cost.durationMs).toBe(1800)
  })

  it('does nothing for a chat saved before the totals were kept', () => {
    store.restoreChat(null)
    expect(store.get().cost.usd).toBe(0)
  })

  it('keeps what it has when a field is missing, rather than reading it as zero', () => {
    store.restoreChat({ usd: 1 })
    expect(store.get().cost.usd).toBe(1)
    expect(store.get().cost.turns).toBe(0)
  })
})

describe('createChatStatus: one per chat', () => {
  it('keeps the cost of two chats apart', () => {
    const a = createChatStatus()
    const b = createChatStatus()
    a.apply({ type: 'metrics', metrics: metrics(0.5) })
    expect(a.get().cost.usd).toBeGreaterThan(0)
    expect(b.get().cost.usd).toBe(0)
  })

  it("ignores a limit: that is the account's", () => {
    const a = createChatStatus()
    a.apply({
      type: 'limit',
      limit: {
        kind: 'five_hour',
        utilization: 0,
        resetsAtMs: 0,
        overage: false,
        status: 'allowed',
      },
    })
    expect(a.get()).not.toHaveProperty('limits')
  })
})
