import type { Sent } from '@/entities/attachment'
import type { ConversationState, Conversation } from './conversation.types'

import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import { freshTurnId } from '@/entities/conversation'
import type { ToolActivity, ToolResult, Turn } from '@/entities/conversation'
import { heldOutput, heldTurns } from './hold/hold'

type Listener = () => void

const EMPTY: ConversationState = {
  turns: [],
  status: 'done',
  permission: null,
  chores: [],
  trouble: false,
}

function joined(existing: string, added: string): string {
  return existing.length === 0 ? added : `${existing}\n\n${added}`
}

function fresh(role: Turn['role'], over: Partial<Turn> = {}): Turn {
  return {
    id: freshTurnId(),
    role,
    text: '',
    tools: [],
    draft: '',
    thinking: '',
    startedAtMs: Date.now(),
    ...over,
  }
}

// A turn end can arrive after system turns (metrics, notices) already landed
// on top of the drafting turn, so this looks past them for the draft to settle.
function draftHolderIndex(turns: Turn[]): number {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]!
    if (turn.role === 'system') continue
    return turn.draft.length === 0 ? -1 : index
  }
  return -1
}

export function createConversation(): Conversation {
  let state: ConversationState = EMPTY
  const listeners = new Set<Listener>()

  function emit(next: ConversationState): void {
    const turns = heldTurns(next.turns)
    state = turns === next.turns ? next : { ...next, turns }
    for (const listener of listeners) listener()
  }

  function appendable(role: Turn['role']): Turn | null {
    if (role === 'system') return null
    const last = state.turns.at(-1)
    if (!last || last.role !== role) return null
    return last.tools.length === 0 ? last : null
  }

  function added(turn: Turn): void {
    emit({ ...state, turns: [...state.turns, turn] })
  }

  function replacedLast(turn: Turn): void {
    emit({ ...state, turns: [...state.turns.slice(0, -1), turn] })
  }

  return {
    get(): ConversationState {
      return state
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    say(role: Turn['role'], text: string, to?: string, files?: Sent[]): void {
      const target = to === undefined && (files ?? []).length === 0 ? appendable(role) : null
      if (target) {
        replacedLast({ ...target, draft: '', text: joined(target.text, text) })
        return
      }
      added(
        fresh(role, {
          text,
          ...(to === undefined ? {} : { to }),
          ...((files ?? []).length === 0 ? {} : { files }),
        }),
      )
    },
    tool(line: string, toolUseId: string | null, input?: unknown): void {
      const last = state.turns.at(-1)
      const activity: ToolActivity = {
        line,
        toolUseId,
        input: input ?? null,
        result: null,
        startedAtMs: Date.now(),
        endedAtMs: null,
      }
      if (last?.role !== 'assistant') {
        added(fresh('assistant', { tools: [activity] }))
        return
      }
      replacedLast({ ...last, tools: [...last.tools, activity] })
    },
    toolResult(toolUseId: string, result: ToolResult): void {
      const index = state.turns.findIndex((turn) =>
        turn.tools.some((tool) => tool.toolUseId === toolUseId),
      )
      if (index === -1) return
      const held = {
        ...result,
        stdout: heldOutput(result.stdout),
        stderr: heldOutput(result.stderr),
      }
      const turn = state.turns[index]!
      const tools = turn.tools.map((tool) =>
        tool.toolUseId === toolUseId ? { ...tool, result: held, endedAtMs: Date.now() } : tool,
      )
      const turns = [...state.turns]
      turns[index] = { ...turn, tools }
      emit({ ...state, turns })
    },
    think(text: string): void {
      const last = state.turns.at(-1)
      if (last?.role !== 'assistant' || last.tools.length > 0) {
        added(fresh('assistant', { thinking: text }))
        return
      }
      replacedLast({ ...last, thinking: last.thinking ? `${last.thinking}\n\n${text}` : text })
    },
    system(text: string): void {
      added(fresh('system', { text }))
    },
    delta(text: string): void {
      const last = state.turns.at(-1)
      if (last?.role !== 'assistant' || last.tools.length > 0) {
        added(fresh('assistant', { draft: text }))
        return
      }
      replacedLast({ ...last, draft: last.draft + text })
    },
    settleDraft(): void {
      const index = draftHolderIndex(state.turns)
      if (index === -1) return
      const turn = state.turns[index]!
      const merged = { ...turn, draft: '', text: joined(turn.text, turn.draft) }
      const turns = [...state.turns]
      turns[index] = merged
      emit({ ...state, turns })
    },
    setStatus(status: SessionStatus): void {
      if (state.status === status) return
      emit({ ...state, status })
    },
    setPermission(permission: PermissionAsk | null): void {
      emit({ ...state, permission })
    },
    setTrouble(trouble: boolean): void {
      if (state.trouble === trouble) return
      emit({ ...state, trouble })
    },
    startChore(id: string, line: string): void {
      if (state.chores.some((chore) => chore.id === id)) return
      emit({ ...state, chores: [...state.chores, { id, line, startedAtMs: Date.now() }] })
    },
    endChore(id: string): void {
      const left = state.chores.filter((chore) => chore.id !== id)
      if (left.length === state.chores.length) return
      emit({ ...state, chores: left })
    },
    clearChores(): void {
      if (state.chores.length === 0) return
      emit({ ...state, chores: [] })
    },
    restore(turns: Turn[]): void {
      emit({ ...EMPTY, turns })
    },
    reset(): void {
      emit({ ...EMPTY })
    },
  }
}

// Until every consumer takes its conversation as an argument (Task 9).
export const conversation = createConversation()
