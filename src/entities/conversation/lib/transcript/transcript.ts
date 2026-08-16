import type { ToolActivity, ToolResult, Turn } from '../../model/turn'
import type { ChatSpend, ChatSummary, Transcript } from './transcript.types'

const TURN_CAP = 200
const OUTPUT_CAP = 4000
const TITLE_CAP = 60

export const UNTITLED = 'New chat'

const CHAT_ID = /^chat-[0-9a-z]{1,32}-[0-9a-z]{1,16}$/

export function isChatId(value: unknown): value is string {
  return typeof value === 'string' && CHAT_ID.test(value)
}

export function chatId(nowMs: number, salt: string): string {
  return `chat-${nowMs.toString(36)}-${salt}`
}

export function titleOf(turns: Turn[]): string {
  const asked = turns.find((turn) => turn.role === 'user')
  if (asked === undefined) return UNTITLED
  const line = asked.text.replace(/\s+/g, ' ').trim()
  if (line.length === 0) return UNTITLED
  return line.length <= TITLE_CAP ? line : `${line.slice(0, TITLE_CAP)}…`
}

export function packTranscript(
  turns: Turn[],
  summary: Omit<ChatSummary, 'title'>,
  spend: ChatSpend | null = null,
): Transcript {
  return {
    ...summary,
    title: titleOf(turns),
    spend,
    turns: turns.slice(-TURN_CAP).map(packTurn),
  }
}

function packTurn(turn: Turn): Turn {
  return { ...turn, draft: '', tools: turn.tools.map(packTool) }
}

function packTool(tool: ToolActivity): ToolActivity {
  return tool.result === null ? tool : { ...tool, result: packResult(tool.result) }
}

function packResult(result: ToolResult): ToolResult {
  return { ...result, stdout: cut(result.stdout), stderr: cut(result.stderr) }
}

function cut(text: string): string {
  return text.length <= OUTPUT_CAP ? text : `${text.slice(0, OUTPUT_CAP)}\n…`
}

export function readTranscript(saved: unknown): Transcript | null {
  if (typeof saved !== 'object' || saved === null) return null
  const source = saved as Record<string, unknown>
  if (!isChatId(source.id) || !Array.isArray(source.turns)) return null
  const turns = source.turns.filter(isTurn)
  if (turns.length === 0) return null
  return {
    id: source.id,
    title: typeof source.title === 'string' && source.title.length > 0 ? source.title : titleOf(turns),
    sessionId: typeof source.sessionId === 'string' ? source.sessionId : null,
    savedAtMs: typeof source.savedAtMs === 'number' ? source.savedAtMs : 0,
    spend: readSpend(source.spend),
    turns: turns.slice(-TURN_CAP),
  }
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function readSpend(saved: unknown): ChatSpend | null {
  if (typeof saved !== 'object' || saved === null) return null
  const source = saved as Record<string, unknown>
  const usd = num(source.usd)
  const turns = num(source.turns)
  if (usd === null || turns === null) return null
  return {
    usd,
    turns,
    tokensOut: num(source.tokensOut) ?? 0,
    tokensIn: num(source.tokensIn) ?? 0,
    cacheRead: num(source.cacheRead) ?? 0,
    cacheWrite: num(source.cacheWrite) ?? 0,
    durationMs: num(source.durationMs) ?? 0,
    contextUsed: num(source.contextUsed) ?? 0,
    contextWindow: num(source.contextWindow),
  }
}

export function summaryOf(transcript: Transcript): ChatSummary {
  const { id, title, sessionId, savedAtMs } = transcript
  return { id, title, sessionId, savedAtMs }
}

function isTurn(value: unknown): value is Turn {
  if (typeof value !== 'object' || value === null) return false
  const turn = value as Record<string, unknown>
  switch (turn.role) {
    case 'user':
    case 'assistant':
    case 'system':
      break
    default:
      return false
  }
  return typeof turn.text === 'string' && Array.isArray(turn.tools)
}
