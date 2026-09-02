import type { ChatStatusState, StatusState } from './status-store.types'

import type { StatusEvent } from '@/entities/claude-cli/@x/agent-session'
import type { ChatSpend } from '@/entities/conversation/@x/agent-session'
import { accountStatus } from '../account-status/account-status'
import { spentAfter } from '../spend/spend'
import { statusView } from '../status-view/status-view'

type Listener = () => void

const EMPTY: ChatStatusState = {
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
  activity: 'idle',
}

// One of these per chat: the session, the context window and the running
// cost belong to a single conversation, not to the account that runs it.
export function createChatStatus() {
  let state: ChatStatusState = EMPTY
  let carried = 0
  const listeners = new Set<Listener>()

  function emit(next: ChatStatusState): void {
    state = next
    for (const listener of listeners) listener()
  }

  return {
    get(): ChatStatusState {
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
      if (event.type === 'activity') {
        if (state.activity === event.activity) return
        emit({ ...state, activity: event.activity })
        return
      }
      // 'limit' belongs to accountStatus; 'compacted' changes nothing here.
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
    // The session on hand is the CLI's, and the CLI's session belongs to the
    // account that started it: after a change, what it says about the agents,
    // the connectors and the model is somebody else's.
    forgetSession(): void {
      emit({ ...state, session: null, probed: false })
    },
    learnProbe(session: ChatStatusState['session']): void {
      emit({ ...state, session, probed: true })
    },
    reset(keepSpend = false): void {
      if (!keepSpend) carried = 0
      emit({
        ...EMPTY,
        cost: { ...EMPTY.cost, usd: carried },
        context: keepSpend ? state.context : EMPTY.context,
      })
    },
  }
}

// Compatibility shim: today's single global chat, kept until every consumer
// carries its own ChatStatus (Task 9 deletes this).
const chatShim = createChatStatus()

let view: StatusState = statusView(chatShim.get(), accountStatus.get())
chatShim.subscribe(() => {
  view = statusView(chatShim.get(), accountStatus.get())
})
accountStatus.subscribe(() => {
  view = statusView(chatShim.get(), accountStatus.get())
})

export const statusStore = {
  get(): StatusState {
    return view
  },
  subscribe(listener: Listener): () => void {
    const stopChat = chatShim.subscribe(listener)
    const stopAccount = accountStatus.subscribe(listener)
    return () => {
      stopChat()
      stopAccount()
    }
  },
  apply(event: StatusEvent): void {
    if (event.type === 'limit') accountStatus.applyLimit(event.limit)
    else chatShim.apply(event)
  },
  setUpdate: accountStatus.setUpdate,
  restoreChat: chatShim.restoreChat,
  usageRead: accountStatus.usageRead,
  usageUnreadable: accountStatus.usageUnreadable,
  usageForgotten: accountStatus.usageForgotten,
  usageKept: accountStatus.usageKept,
  forgetSession: chatShim.forgetSession,
  learnProbe: chatShim.learnProbe,
  reset(keepSpend = false): void {
    chatShim.reset(keepSpend)
  },
}
