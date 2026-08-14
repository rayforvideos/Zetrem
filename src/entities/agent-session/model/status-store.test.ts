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

describe('statusStore — 마지막으로 알려진 진실', () => {
  it('아무 말도 못 들었으면 모른다고 한다 — 화면이 지어내지 못하게', () => {
    const state = statusStore.get()
    expect(state.session).toBeNull()
    expect(state.limit).toBeNull()
    expect(state.update).toBeNull()
    expect(state.context).toEqual({ used: 0, window: null })
  })

  it('init 이 신원을 채운다', () => {
    statusStore.apply({ type: 'session', session })
    expect(statusStore.get().session?.cliVersion).toBe('2.1.231')
  })

  it('컨텍스트는 마지막 값으로 덮어쓴다 — 누적이 아니라 현재 크기다', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    statusStore.apply({ type: 'context', used: 31059 })
    expect(statusStore.get().context.used).toBe(31059)
  })

  it('분모는 result 가 준 뒤에야 생긴다', () => {
    statusStore.apply({ type: 'context', used: 28364 })
    expect(statusStore.get().context.window).toBeNull()
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('분모를 모르는 result 는 이미 알던 분모를 지우지 않는다', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.1, 1_000_000) })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.2, null) })
    expect(statusStore.get().context.window).toBe(1_000_000)
  })

  it('비용은 세션 누적이고, 턴 차액을 따로 든다 (실측 0.125331 → 0.166547)', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.125331) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.125331, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.125331, 6)

    statusStore.apply({ type: 'metrics', metrics: metrics(0.166547) })
    expect(statusStore.get().cost.usd).toBeCloseTo(0.166547, 6)
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.041216, 6)
  })

  it('한도는 마지막 경고를 든다', () => {
    statusStore.apply({
      type: 'limit',
      limit: { kind: 'seven_day', utilization: 0.28, resetsAtMs: 1787173200000, overage: false, status: 'allowed_warning' },
    })
    expect(statusStore.get().limit?.utilization).toBe(0.28)
  })

  it('훅의 시작과 끝을 hook_id 로 이어붙인다', () => {
    statusStore.apply({ type: 'hookStarted', hookId: 'c3d7', name: 'SessionStart:startup', event: 'SessionStart' })
    expect(statusStore.get().hooks).toHaveLength(0)
    statusStore.apply({ type: 'hookDone', hookId: 'c3d7', exitCode: 0, stderr: '' })
    const [hook] = statusStore.get().hooks
    expect(hook).toMatchObject({ name: 'SessionStart:startup', event: 'SessionStart', exitCode: 0 })
    expect(typeof hook!.ms).toBe('number')
  })

  it('짝 없는 hookDone 은 버린다 — 이름 없는 줄을 화면에 세우지 않는다', () => {
    statusStore.apply({ type: 'hookDone', hookId: 'none', exitCode: 1, stderr: 'x' })
    expect(statusStore.get().hooks).toEqual([])
  })

  it('훅은 최근 다섯 개만 든다 — 서랍이 훅 로그가 되면 안 된다', () => {
    for (let i = 0; i < 7; i += 1) {
      statusStore.apply({ type: 'hookStarted', hookId: `h${i}`, name: `훅${i}`, event: 'PreToolUse' })
      statusStore.apply({ type: 'hookDone', hookId: `h${i}`, exitCode: 0, stderr: '' })
    }
    const hooks = statusStore.get().hooks
    expect(hooks).toHaveLength(5)
    expect(hooks[0]!.name).toBe('훅6')
  })

  it('진행 상태를 든다', () => {
    statusStore.apply({ type: 'activity', activity: 'requesting' })
    expect(statusStore.get().activity).toBe('requesting')
  })

  it('업데이트 정보는 CLI 가 아니라 우리가 넣는다', () => {
    statusStore.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
    expect(statusStore.get().update).toEqual({ current: '2.1.231', latest: '2.1.240', managedBy: 'Homebrew' })
  })

  it('reset 은 대기 중인 훅도 비운다 — 끝난 세션의 hookDone 이 새 세션에 끼어들지 않는다', () => {
    statusStore.apply({ type: 'hookStarted', hookId: 'x', name: 'n', event: 'e' })
    statusStore.reset()
    statusStore.apply({ type: 'hookDone', hookId: 'x', exitCode: 0, stderr: '' })
    expect(statusStore.get().hooks).toEqual([])
  })

  it('reset 은 지난 세션의 값을 전부 놓는다 — 새 세션이 옛 비용 위에서 차액을 재면 $ 가 사라진다', () => {
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
    expect(statusStore.get().limit).toBeNull()

    statusStore.apply({ type: 'metrics', metrics: metrics(0.02) })
    expect(statusStore.get().cost.lastTurnUsd).toBeCloseTo(0.02, 6)
  })

  it('reset 이 CLI 버전은 남긴다 — 그건 세션의 값이 아니라 설치된 것의 사실이다', () => {
    statusStore.setUpdate({ current: '2.1.231', latest: '2.1.240', managedBy: 'npm' })
    statusStore.reset()
    expect(statusStore.get().update).toEqual({ current: '2.1.231', latest: '2.1.240', managedBy: 'npm' })
  })

  it('누적 비용이 줄어들어도 턴 차액은 0 아래로 내려가지 않는다', () => {
    statusStore.apply({ type: 'metrics', metrics: metrics(0.2) })
    statusStore.apply({ type: 'metrics', metrics: metrics(0.05) })
    expect(statusStore.get().cost.lastTurnUsd).toBe(0)
  })

  it('Context 크기가 같으면 다시 알리지 않는다 — 도구 왕복마다 같은 수를 다시 그리지 않는다', () => {
    let count = 0
    const stop = statusStore.subscribe(() => { count += 1 })
    statusStore.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    statusStore.apply({ type: 'context', used: 28364 })
    expect(count).toBe(1)
    stop()
  })

  it('구독자에게 알리고, 변화가 없으면 알리지 않는다', () => {
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
