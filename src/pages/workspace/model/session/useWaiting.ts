import { useEffect, useEffectEvent, useRef } from 'react'
import { toast } from 'sonner'
import { nudgeFor } from '@/entities/agent-session'
import { tellings } from './waiting/waiting'
import type { Ledger, Telling, Wait } from './waiting/waiting.types'
import { t } from '@lingui/core/macro'

// The in-app cue is a passing word, not a card to be dismissed: the sidebar
// row is what carries the state for as long as it stands.
const TOAST_MS = 8_000

function watching(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

// Telling the person the run has stopped for them, wherever they are: a system
// notice when the window is away, a toast when they are in the app but not on
// that chat, and nothing at all when the ask is already in front of them.
export function useWaiting(
  waits: Wait[],
  wanted: boolean,
  nowMs: number,
  onOpen: (chatId: string) => void,
): void {
  const ledger = useRef<Ledger>({})
  const raised = useRef(new Map<string, string | number>())

  const tell = useEffectEvent(() => {
    const found = tellings(waits, ledger.current, { watching: watching(), nowMs })
    ledger.current = found.ledger
    // A wait that is gone was answered, and the toast that named it is no
    // longer true. This is the one place clearing happens, so answering in any
    // chat clears everything said about it at once.
    for (const [chatId, id] of raised.current) {
      if (found.ledger[chatId] !== undefined) continue
      toast.dismiss(id)
      raised.current.delete(chatId)
    }
    for (const one of found.say) say(one)
  })

  function say(one: Telling): void {
    if (one.where === 'system') {
      const nudge = nudgeFor({
        wanted,
        watching: false,
        reason: one.wait.kind === 'permission' ? 'permission' : 'question',
        tool: one.wait.kind === 'permission' ? one.wait.said : '',
        said: one.wait.kind === 'question' ? one.wait.said : '',
        again: one.again,
      })
      if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
      return
    }
    const held = raised.current.get(one.wait.chatId)
    if (held !== undefined) toast.dismiss(held)
    const named = one.wait.title.length > 0 ? one.wait.title : t`This chat`
    raised.current.set(
      one.wait.chatId,
      toast(one.again ? t`${named}: Still waiting for you` : t`${named}: Waiting for you`, {
        duration: TOAST_MS,
        action: { label: t`Open`, onClick: () => onOpen(one.wait.chatId) },
      }),
    )
  }

  // Written as a line rather than passed as the array: a fresh array every
  // render would run this on every line of every stream.
  const shape = waits
    .map((one) => `${one.chatId}/${one.mark}/${one.onScreen}/${one.steady}`)
    .join('|')

  useEffect(() => {
    tell()
  }, [shape, nowMs])

  // Where the person is changes without the screen rendering, and a run that
  // stopped while they were watching is one they hear about the moment they
  // look away.
  useEffect(() => {
    const moved = (): void => tell()
    window.addEventListener('focus', moved)
    window.addEventListener('blur', moved)
    document.addEventListener('visibilitychange', moved)
    return () => {
      window.removeEventListener('focus', moved)
      window.removeEventListener('blur', moved)
      document.removeEventListener('visibilitychange', moved)
    }
  }, [])
}
