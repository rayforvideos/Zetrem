import { useEffect, useEffectEvent, useRef } from 'react'
import { nudgeFor } from '@/entities/agent-session'
import { SETTLE_GRACE_MS } from './settle-nudge/settle-nudge'
import type { WaitingOn } from './waiting/waiting.types'

function watching(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

// The word once the run is over. What the run stopped *for* belongs to
// useWaiting, so a turn that settled on a permission or a question says
// nothing here: it would be a second notice for one event, and the wrong one,
// since "finished" is the opposite of what happened.
export function useNudge(
  wanted: boolean,
  busy: boolean,
  waiting: WaitingOn | null,
  trouble: boolean,
): void {
  const wasBusy = useRef(false)

  // The timer reads these when it fires, not when it was set, so a change
  // mid-grace (the orchestrator stopping to ask) is honoured.
  const settled = useEffectEvent(() => {
    const nudge = nudgeFor({
      wanted,
      watching: watching(),
      reason: 'done',
      tool: '',
      asked: waiting !== null,
      trouble,
    })
    if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
  })

  useEffect(() => {
    const justSettled = wasBusy.current && !busy
    wasBusy.current = busy
    if (!justSettled) return undefined
    const timer = window.setTimeout(settled, SETTLE_GRACE_MS)
    // Busy again before the grace period is up (the orchestrator waking to
    // relay a teammate's result) cancels the notice for that gap.
    return () => window.clearTimeout(timer)
  }, [busy])
}
