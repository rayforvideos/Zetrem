import type { RateLimit, SessionIdentity, StatusEvent } from '../api/claude/status'

export type HookRun = { name: string; event: string; exitCode: number; ms: number }

export type UpdateInfo = {
  current: string | null
  latest: string | null
  managedBy: string | null
}

export type StatusState = {
  session: SessionIdentity | null
  context: { used: number; window: number | null }
  cost: {
    usd: number
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
      if (state.context.used === event.used) return
      emit({ ...state, context: { ...state.context, used: event.used } })
      return
    }
    if (event.type === 'metrics') {
      const m = event.metrics
      emit({
        ...state,
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
      if (!started) return
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
  },
  setUpdate(update: UpdateInfo): void {
    emit({ ...state, update })
  },
  reset(): void {
    pending = new Map()
    emit({ ...EMPTY, update: state.update })
  },
}
