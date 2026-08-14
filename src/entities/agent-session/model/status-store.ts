import type { RateLimit, SessionIdentity, StatusEvent } from '../api/claude/status'

/**
 * 상태의 층이 드는 마지막 진실 하나. conversation 의 형제다 —
 * 지속하는 값은 여기, 일어난 사건은 대화로 간다. 그래야 나중에 올려보면
 * 그 일이 언제 일어났는지 보인다.
 *
 * null 은 "아직 모른다" 다. 모르는 것을 기본값으로 채우면 화면이 거짓말한다.
 */
export type HookRun = { name: string; event: string; exitCode: number; ms: number }

export type UpdateInfo = {
  current: string | null
  latest: string | null
  /** 'Homebrew' | 'npm' | null — 갱신을 어디에 부탁해야 하는지 */
  managedBy: string | null
}

export type StatusState = {
  session: SessionIdentity | null
  context: { used: number; window: number | null }
  cost: {
    /** 세션 누적 */
    usd: number
    /** 마지막 턴의 차액 — 대화의 턴 끝 줄이 쓴다 */
    lastTurnUsd: number
    tokens: { in: number; out: number; cacheRead: number; cacheCreate: number }
    durationMs: number
    ttftMs: number | null
    turns: number
  }
  limit: RateLimit | null
  hooks: HookRun[]
  update: UpdateInfo | null
  activity: 'requesting' | 'idle'
}

/** 서랍은 훅 로그가 아니다 — 최근 것만 든다 */
const HOOK_KEEP = 5

const EMPTY: StatusState = {
  session: null,
  context: { used: 0, window: null },
  cost: {
    usd: 0,
    lastTurnUsd: 0,
    tokens: { in: 0, out: 0, cacheRead: 0, cacheCreate: 0 },
    durationMs: 0,
    ttftMs: null,
    turns: 0,
  },
  limit: null,
  hooks: [],
  update: null,
  activity: 'idle',
}

type Listener = () => void

let state: StatusState = EMPTY
/** 시작만 알려진 훅들. 끝이 와야 목록에 선다 (이름과 걸린 시간이 함께 있어야 읽힌다) */
let pending = new Map<string, { name: string; event: string; startedAtMs: number }>()
const listeners = new Set<Listener>()

function emit(next: StatusState): void {
  state = next
  for (const listener of listeners) listener()
}

export const statusStore = {
  get(): StatusState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  apply(event: StatusEvent): void {
    if (event.type === 'session') {
      emit({ ...state, session: event.session })
      return
    }
    if (event.type === 'context') {
      // status.ts 는 턴당 한 번이 아니라 모든 assistant usage 에서 이 이벤트를 낸다 —
      // 도구를 여러 번 왕복하는 턴은 같은 값을 반복해 내보낸다. 같으면 다시 그릴 것이 없다
      if (state.context.used === event.used) return
      // 컨텍스트는 누적이 아니라 현재 크기다 — 덮어쓴다
      emit({ ...state, context: { ...state.context, used: event.used } })
      return
    }
    if (event.type === 'metrics') {
      const m = event.metrics
      emit({
        ...state,
        // 분모를 모르는 result 가 이미 알던 분모를 지우면 % 가 사라진다
        context: { ...state.context, window: m.contextWindow ?? state.context.window },
        cost: {
          usd: m.costUsd,
          lastTurnUsd: Math.max(0, m.costUsd - state.cost.usd),
          tokens: m.tokens,
          durationMs: m.durationMs,
          ttftMs: m.ttftMs,
          turns: m.turns,
        },
      })
      return
    }
    if (event.type === 'limit') {
      emit({ ...state, limit: event.limit })
      return
    }
    if (event.type === 'hookStarted') {
      pending.set(event.hookId, { name: event.name, event: event.event, startedAtMs: Date.now() })
      return
    }
    if (event.type === 'hookDone') {
      const started = pending.get(event.hookId)
      if (!started) return // 이름을 모르는 훅은 화면에 세울 수 없다
      pending.delete(event.hookId)
      const run: HookRun = {
        name: started.name,
        event: started.event,
        exitCode: event.exitCode,
        ms: Date.now() - started.startedAtMs,
      }
      emit({ ...state, hooks: [run, ...state.hooks].slice(0, HOOK_KEEP) })
      return
    }
    if (event.type === 'activity') {
      if (state.activity === event.activity) return
      emit({ ...state, activity: event.activity })
      return
    }
    // compacted 는 사건이라 대화로 간다 (use-agent). 상태의 층에는 남길 것이 없다
  },
  setUpdate(update: UpdateInfo): void {
    emit({ ...state, update })
  },
  /**
   * 새 세션이 열릴 때 부른다 — 지난 세션의 값이 새 세션의 것으로 읽히면 화면이 거짓말한다.
   * (비용이 남아 있으면 새 세션의 첫 result 가 `max(0, 작은값 − 큰값) = 0` 을 내고
   * 턴 결산 줄에서 $ 가 말없이 빠진다.)
   *
   * `update` 만 남긴다: 그것은 이 세션의 값이 아니라 **설치된 CLI 의 사실**이다.
   * 함께 지우면 상태줄의 버전 칸이 사라지고, 물어보는 자리(use-cli-update)는 세션 init 의
   * cliVersion 이 바뀔 때만 다시 도므로 앱을 다시 띄우기 전까지 돌아오지 않는다.
   */
  reset(): void {
    pending = new Map()
    emit({ ...EMPTY, update: state.update })
  },
}
