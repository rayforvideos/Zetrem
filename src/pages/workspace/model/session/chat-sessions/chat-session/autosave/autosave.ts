import { packTranscript } from '@/entities/conversation'
import type { ChatSpend, Transcript } from '@/entities/conversation'
import { troubleLine } from '@/shared/lib/ask/ask'
import { maySave } from '../../../../chat/may-save/may-save'
import { stampOf } from '../../../../chat/save-stamp/save-stamp'
import type { Autosave, AutosaveOwner } from './autosave.types'
import { t } from '@lingui/core/macro'

// A chat writes itself back, whether or not anybody is looking at it. The
// store tells us the moment anything changed, which is mid-sentence too, so
// the check runs once the change has settled rather than on every keystroke
// of the stream.
export function attachAutosave(owner: AutosaveOwner): Autosave {
  let lastSaved = ''
  let toldSaveTrouble = false
  let due = false

  function spend(): ChatSpend | null {
    const spent = owner.stores.status.get()
    if (spent.cost.turns === 0) return owner.meta.spend
    return {
      usd: spent.cost.usd,
      turns: spent.cost.turns,
      tokensOut: spent.cost.tokens.out,
      tokensIn: spent.cost.tokens.in,
      cacheRead: spent.cost.tokens.cacheRead,
      cacheWrite: spent.cost.tokens.cacheCreate,
      durationMs: spent.cost.durationMs,
      contextUsed: spent.context.used,
      contextWindow: spent.context.window,
    }
  }

  function pack(): Transcript {
    return packTranscript(
      owner.stores.conversation.get().turns,
      {
        id: owner.chatId,
        sessionId: owner.thread(),
        savedAtMs: Date.now(),
        title: owner.meta.title ?? undefined,
        folder: owner.meta.folder,
      },
      spend(),
    )
  }

  function write(): void {
    const packed = pack()
    const stamp = stampOf(packed)
    if (stamp === lastSaved) return
    lastSaved = stamp
    void owner.deps
      .writeTranscript(owner.project, packed)
      .then(() => {
        toldSaveTrouble = false
      })
      .catch((cause: unknown) => {
        lastSaved = ''
        if (toldSaveTrouble) return
        toldSaveTrouble = true
        owner.stores.conversation.system(troubleLine(t`This chat is not being saved`, cause))
        owner.deps.onSaveTrouble(cause)
      })
  }

  // Whatever is on screen goes to disk before it is replaced. The autosave
  // waits for a turn to settle; this does not, or a chat left mid-reply would
  // be a turn behind on disk.
  function keep(): void {
    if (owner.stores.conversation.get().turns.length === 0) return
    write()
  }

  function settled(): void {
    due = false
    const conv = owner.stores.conversation.get()
    const allowed = maySave({
      ready: true,
      project: owner.project,
      loadedFor: owner.project,
      openId: owner.chatId,
      status: conv.status,
      turnCount: conv.turns.length,
    })
    if (allowed) write()
  }

  // A message writes the person's turn and sets the status to working in the
  // same breath: waiting a tick means the save reads the state it meant to.
  function schedule(): void {
    if (due) return
    due = true
    queueMicrotask(settled)
  }

  owner.stores.conversation.subscribe(schedule)
  owner.stores.status.subscribe(schedule)

  return {
    keep,
    markSaved(): void {
      lastSaved = stampOf(pack())
    },
  }
}
