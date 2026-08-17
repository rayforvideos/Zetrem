import type { StatusState, UpdateInfo } from './status-store.types'

import type { StatusEvent } from '../../api/claude/status/status.types'
import { withLimit } from '../limits/limits'
import type { ChatSpend } from '@/entities/conversation'
import { spentAfter } from '../spend/spend'

const EMPTY: StatusState = {
  usage: 'unread',
  usageAtMs: null,
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
}

type Listener = () => void

let state: StatusState = EMPTY
let carried = 0
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
      emit({ ...state, session: event.session, probed: false })
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
        cost: spentAfter(state.cost, m, carried),
      })
      return
    }
    if (event.type === 'limit') {
      emit({ ...state, limits: withLimit(state.limits, event.limit) })
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
  restoreChat(spend: Partial<ChatSpend> | null): void {
    if (spend === null || spend === undefined) return
    carried = spend.usd ?? carried
    emit({
      ...state,
      context: {
        used: spend.contextUsed ?? state.context.used,
        window: spend.contextWindow ?? state.context.window,
      },
      cost: {
        ...state.cost,
        usd: spend.usd ?? state.cost.usd,
        turns: spend.turns ?? state.cost.turns,
        durationMs: spend.durationMs ?? state.cost.durationMs,
        tokens: {
          in: spend.tokensIn ?? state.cost.tokens.in,
          out: spend.tokensOut ?? state.cost.tokens.out,
          cacheRead: spend.cacheRead ?? state.cost.tokens.cacheRead,
          cacheCreate: spend.cacheWrite ?? state.cost.tokens.cacheCreate,
        },
      },
    })
  },

  usageRead(atMs: number): void {
    emit({ ...state, usage: 'read', usageAtMs: atMs })
  },
  usageUnreadable(): void {
    if (state.usage !== 'unread') return
    emit({ ...state, usage: 'unreadable' })
  },
  learnProbe(session: StatusState['session']): void {
    emit({ ...state, session, probed: true })
  },
  reset(keepSpend = false): void {
    if (!keepSpend) carried = 0
    emit({
      ...EMPTY,
      update: state.update,
      cost: { ...EMPTY.cost, usd: carried },
      context: keepSpend ? state.context : EMPTY.context,
    })
  },
}
