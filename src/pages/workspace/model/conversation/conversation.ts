import type { ConversationState } from './conversation.types'

import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'
import type { ToolActivity, ToolResult, Turn } from '@/entities/conversation'
import { heldOutput, heldTurns } from './hold/hold'

type Listener = () => void

const EMPTY: ConversationState = { turns: [], status: 'done', permission: null }

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

function joined(existing: string, added: string): string {
  return existing.length === 0 ? added : `${existing}\n\n${added}`
}

export const conversation = {
  get(): ConversationState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  say(role: Turn['role'], text: string, to?: string): void {
    const target = to === undefined ? appendable(role) : null
    if (target) {
      const merged = { ...target, draft: '', text: joined(target.text, text) }
      emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
      return
    }
    emit({
      ...state,
      turns: [
        ...state.turns,
        {
          role,
          text,
          tools: [],
          draft: '',
          thinking: '',
          startedAtMs: Date.now(),
          ...(to === undefined ? {} : { to }),
        },
      ],
    })
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
    if (!last || last.role !== 'assistant') {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [activity], draft: '', thinking: '', startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, tools: [...last.tools, activity] }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
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
    if (!last || last.role !== 'assistant' || last.tools.length > 0) {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [], draft: '', thinking: text, startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, thinking: last.thinking ? `${last.thinking}\n\n${text}` : text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  system(text: string): void {
    emit({
      ...state,
      turns: [
        ...state.turns,
        { role: 'system', text, tools: [], draft: '', thinking: '', startedAtMs: Date.now() },
      ],
    })
  },
  delta(text: string): void {
    const last = state.turns.at(-1)
    if (!last || last.role !== 'assistant' || last.tools.length > 0) {
      emit({
        ...state,
        turns: [
          ...state.turns,
          { role: 'assistant', text: '', tools: [], draft: text, thinking: '', startedAtMs: Date.now() },
        ],
      })
      return
    }
    const merged = { ...last, draft: last.draft + text }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  settleDraft(): void {
    const last = state.turns.at(-1)
    if (!last || last.draft.length === 0) return
    const merged = { ...last, draft: '', text: joined(last.text, last.draft) }
    emit({ ...state, turns: [...state.turns.slice(0, -1), merged] })
  },
  setStatus(status: SessionStatus): void {
    if (state.status === status) return
    emit({ ...state, status })
  },
  setPermission(permission: PermissionAsk | null): void {
    emit({ ...state, permission })
  },
  restore(turns: Turn[]): void {
    emit({ turns, status: 'done', permission: null })
  },
  reset(): void {
    emit({ turns: [], status: 'done', permission: null })
  },
}
