import type { Sent } from '../../../attachment/lib/attachment/attachment.types'
import type { ToolActivity, ToolResult, Turn } from '../../model/turn'
import type { ChatSpend, ChatSummary, Transcript } from './transcript.types'

const TURN_CAP = 200
const OUTPUT_CAP = 4000
const TITLE_CAP = 60

// An untitled chat stays empty here. Naming it is the screen's job.
export const UNTITLED = ''

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
  const turns = source.turns.map(readTurn).filter((turn): turn is Turn => turn !== null)
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

function isRole(value: unknown): value is Turn['role'] {
  return value === 'user' || value === 'assistant' || value === 'system'
}

// A turn from an older schema, or a partially corrupted file, must not carry
// bad shapes into the renderer. Unknown fields default rather than reject.
function readTurn(value: unknown): Turn | null {
  if (typeof value !== 'object' || value === null) return null
  const turn = value as Record<string, unknown>
  if (!isRole(turn.role) || typeof turn.text !== 'string') return null
  const result: Turn = {
    role: turn.role,
    text: turn.text,
    tools: Array.isArray(turn.tools)
      ? turn.tools.map(readTool).filter((tool): tool is ToolActivity => tool !== null)
      : [],
    draft: typeof turn.draft === 'string' ? turn.draft : '',
    thinking: typeof turn.thinking === 'string' ? turn.thinking : '',
    startedAtMs: num(turn.startedAtMs) ?? 0,
  }
  if (typeof turn.to === 'string') result.to = turn.to
  if (Array.isArray(turn.files)) {
    result.files = turn.files.filter((file): file is Sent => typeof file === 'object' && file !== null)
  }
  return result
}

function readTool(value: unknown): ToolActivity | null {
  if (typeof value !== 'object' || value === null) return null
  const tool = value as Record<string, unknown>
  if (typeof tool.line !== 'string') return null
  return {
    line: tool.line,
    toolUseId: typeof tool.toolUseId === 'string' ? tool.toolUseId : null,
    input: tool.input,
    result: readToolResult(tool.result),
    startedAtMs: num(tool.startedAtMs) ?? 0,
    endedAtMs: num(tool.endedAtMs),
  }
}

function readToolResult(value: unknown): ToolResult | null {
  if (typeof value !== 'object' || value === null) return null
  const result = value as Record<string, unknown>
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    isError: result.isError === true,
    interrupted: result.interrupted === true,
  }
}
