import type { Turn } from '@/entities/conversation'
import { SETTLE_GRACE_MS } from '../settle-nudge/settle-nudge'
import type { Held, Ledger, Settled, Telling, Wait, WaitingOn, Where } from './waiting.types'

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
// question ever reaches. The app's own notices land on top of that turn
// without being part of it, so they are stepped over: a metrics line arriving
// late must not read as a second question.
export function markOf(conv: Settled): string {
  if (conv.permission !== null) return conv.permission.requestId
  for (let index = conv.turns.length - 1; index >= 0; index -= 1) {
    const turn = conv.turns[index]
    if (turn !== undefined && turn.role !== 'system') return turn.id
  }
  return ''
}

// Where a wait is worth raising. Away from the window there is only the system
// notice; in the app there is the screen itself, and a chat already in view
// needs nothing said about it.
export function whereToTell(at: { watching: boolean; chatOnScreen: boolean }): Where {
  if (!at.watching) return 'system'
  return at.chatOnScreen ? 'nothing' : 'toast'
}

// Every chat that has stopped for the person, named and placed. Each chat
// reports its own wait, so a chat the screen is not showing is known as well
// as the one it is, and moving between them changes nothing about the wait.
export function waitsOf(at: {
  held: Readonly<Record<string, Held>>
  titles: ReadonlyMap<string, string>
  // The chat actually in view, if any. The library and the settings panel both
  // cover the open chat without closing it, and neither is a chat the person
  // can answer from.
  onScreenId: string | null
}): Wait[] {
  return Object.entries(at.held).map(([chatId, one]) => ({
    ...one,
    chatId,
    title: at.titles.get(chatId) ?? '',
    onScreen: chatId === at.onScreenId,
  }))
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
        : { mark: wait.mark, seenAtMs: at.nowMs, toldAtMs: 0, times: 0 }
    next[wait.chatId] = kept
    const where = whereToTell({ watching: at.watching, chatOnScreen: wait.onScreen })
    if (where === 'nothing' || !ripe(wait, kept, at.nowMs)) continue
    say.push({ wait, where, again: kept.times === 1 })
    next[wait.chatId] = { ...kept, toldAtMs: at.nowMs, times: kept.times + 1 }
  }
  return { say, ledger: next }
}

function ripe(
  wait: Wait,
  told: { seenAtMs: number; toldAtMs: number; times: number },
  nowMs: number,
): boolean {
  // The settle grace (#50): a teammate handing back leaves the orchestrator
  // idle for a moment, and a moment is not a turn that ended on a question. A
  // permission ask is explicit and never waits on it.
  if (wait.kind === 'question' && nowMs - told.seenAtMs < SETTLE_GRACE_MS) return false
  if (told.times === 0) return true
  if (told.times > 1) return false
  return nowMs - told.toldAtMs >= REMIND_AFTER_MS
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
