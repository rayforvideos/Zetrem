import type { Turn } from '@/entities/conversation'
import type {
  Ledger,
  LiveWait,
  Settled,
  Telling,
  Wait,
  WaitKind,
  WaitingOn,
  Where,
} from './waiting.types'

// Nobody answers a notice twice, and a notice that keeps repeating is one the
// person learns to ignore. One reminder follows the first word after this
// long, and nothing follows the reminder.
export const REMIND_AFTER_MS = 120_000

// How far back the end of a message is read for a question. A long report can
// hold a question mark anywhere in it; only the close of the message is the
// thing actually being put to the person.
const TAIL = 200

// The runtime's own tool for putting a choice to the person. A turn holding
// one is a question whatever its prose does.
const ASK_TOOL = 'AskUserQuestion'

const ENDERS = new Set(['.', '!', '?', '\n'])

// Whether the run has stopped for the person, and what for. `atWork` is what
// stirring() reports: a teammate still going means the turn is a hand-back in
// flight, not a question left standing. A permission ask is explicit and holds
// whatever anyone else is doing.
export function waitingOn(conv: Settled, atWork: boolean): WaitingOn | null {
  if (conv.permission !== null) return { kind: 'permission', said: conv.permission.toolName }
  if (atWork) return null
  // 'waiting' is the one settled state with a live session behind it. A
  // restored transcript reads 'done', and a question inside one was either
  // answered long ago or never will be.
  if (conv.status !== 'waiting') return null
  const last = lastSaid(conv.turns)
  if (last === null) return null
  const asked = last.tools.find(
    (tool) => tool.line === ASK_TOOL || tool.line.startsWith(`${ASK_TOOL} `),
  )
  if (asked !== undefined) {
    return { kind: 'question', said: questionIn(asked.input) || firstLine(last.text) }
  }
  const said = questionEnding(last.text)
  return said === null ? null : { kind: 'question', said }
}

// What names this particular wait. A permission carries the runtime's own
// request id; a question is named by the turn it ended, which is as far as one
// question ever reaches.
export function markOf(conv: Settled): string {
  if (conv.permission !== null) return conv.permission.requestId
  return conv.turns.at(-1)?.id ?? ''
}

// Where a wait is worth raising. Away from the window there is only the system
// notice; in the app there is the screen itself, and a chat already in view
// needs nothing said about it.
export function whereToTell(at: { watching: boolean; chatOnScreen: boolean }): Where {
  if (!at.watching) return 'system'
  return at.chatOnScreen ? 'nothing' : 'toast'
}

// Every chat that has stopped for the person. The open chat is read in full,
// since its conversation is the one on hand; the rest are known by the state
// their session reports.
export function waitsOf(at: {
  live: Readonly<Record<string, string>>
  titles: ReadonlyMap<string, string>
  openId: string | null
  // The open chat is actually in view: the library and the settings panel both
  // cover it without closing it.
  onScreen: boolean
  open: WaitingOn | null
  openMark: string
  openSteady: boolean
}): Wait[] {
  const out: Wait[] = []
  for (const [chatId, state] of Object.entries(at.live)) {
    if (!isWait(state)) continue
    const mine = chatId === at.openId
    const found = mine && at.open !== null ? at.open : { kind: kindOf(state), said: '' }
    out.push({
      chatId,
      kind: found.kind,
      said: found.said,
      // A chat nobody is reading is known only by its state, so that is its
      // mark: a second ask of the same kind, in a chat off screen, is the same
      // wait as far as the person can tell.
      mark: mine ? at.openMark : state,
      title: at.titles.get(chatId) ?? '',
      onScreen: mine && at.onScreen,
      steady: mine ? at.openSteady : true,
    })
  }
  return out
}

// What to say now, and what the ledger looks like afterwards. Waits that are
// gone fall out of the ledger on their own, which is how answering one clears
// it everywhere at once.
export function tellings(
  waits: readonly Wait[],
  ledger: Ledger,
  at: { watching: boolean; nowMs: number },
): { say: Telling[]; ledger: Ledger } {
  const next: Ledger = {}
  const say: Telling[] = []
  for (const wait of waits) {
    const before = ledger[wait.chatId]
    const kept =
      before !== undefined && before.mark === wait.mark
        ? before
        : { mark: wait.mark, toldAtMs: 0, times: 0 }
    next[wait.chatId] = kept
    const where = whereToTell({ watching: at.watching, chatOnScreen: wait.onScreen })
    if (where === 'nothing' || !ripe(wait, kept, at.nowMs)) continue
    say.push({ wait, where, again: kept.times === 1 })
    next[wait.chatId] = { mark: wait.mark, toldAtMs: at.nowMs, times: kept.times + 1 }
  }
  return { say, ledger: next }
}

function ripe(wait: Wait, told: { toldAtMs: number; times: number }, nowMs: number): boolean {
  if (wait.kind === 'question' && !wait.steady) return false
  if (told.times === 0) return true
  if (told.times > 1) return false
  return nowMs - told.toldAtMs >= REMIND_AFTER_MS
}

function isWait(state: string): state is LiveWait {
  return state === 'asking' || state === 'question'
}

function kindOf(state: LiveWait): WaitKind {
  return state === 'asking' ? 'permission' : 'question'
}

// The last thing anyone said, ignoring the system's own notices, which land on
// top of a turn without being part of it. A person's own turn after it means
// they have already replied.
function lastSaid(turns: readonly Turn[]): Turn | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]
    if (turn === undefined || turn.role === 'system') continue
    return turn.role === 'assistant' ? turn : null
  }
  return null
}

function questionIn(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const asked = (input as { questions?: unknown }).questions
  if (!Array.isArray(asked)) return ''
  for (const one of asked) {
    if (typeof one !== 'object' || one === null) continue
    const said = (one as { question?: unknown }).question
    if (typeof said === 'string' && said.trim().length > 0) return said.trim()
  }
  return ''
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0]?.trim() ?? ''
}

// A fence can close on a line that reads as a question, and a question inside
// a code sample is not one being put to the person.
function withoutCode(text: string): string {
  return text.replace(/```[\s\S]*?(?:```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ')
}

function questionEnding(text: string): string | null {
  const tail = withoutCode(text).trim().slice(-TAIL)
  if (!tail.endsWith('?')) return null
  const body = tail.slice(0, -1)
  let start = 0
  for (let index = body.length - 1; index >= 0; index -= 1) {
    const letter = body[index]
    if (letter !== undefined && ENDERS.has(letter)) {
      start = index + 1
      break
    }
  }
  const said = tail.slice(start).trim()
  return said.length > 1 ? said : null
}
