import { useEffect, useRef } from 'react'
import { nudgeFor } from '@/entities/agent-session'
import type { PermissionAsk } from '@/entities/agent-session'
import { SETTLE_GRACE_MS } from './settle-nudge/settle-nudge'

function watching(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

export function useNudge(
  wanted: boolean,
  busy: boolean,
  permission: PermissionAsk | null,
  trouble: boolean,
): void {
  const wasBusy = useRef(false)
  const askedFor = useRef<string | null>(null)
  // The timer reads these at fire time, not at schedule time, so a change
  // mid-grace (e.g. the orchestrator asks for permission) is honoured.
  // Written after commit, not during render, as the other hooks here do.
  const wantedRef = useRef(wanted)
  const permissionRef = useRef(permission)
  const troubleRef = useRef(trouble)
  useEffect(() => {
    wantedRef.current = wanted
    permissionRef.current = permission
    troubleRef.current = trouble
  })

  useEffect(() => {
    const justSettled = wasBusy.current && !busy
    wasBusy.current = busy
    if (!justSettled) return undefined
    const timer = window.setTimeout(() => {
      const nudge = nudgeFor({
        wanted: wantedRef.current,
        watching: watching(),
        reason: 'done',
        tool: '',
        asked: permissionRef.current !== null,
        trouble: troubleRef.current,
      })
      if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
    }, SETTLE_GRACE_MS)
    // Busy again before the grace period is up (the orchestrator waking to
    // relay a teammate's result) cancels the notice for that gap.
    return () => window.clearTimeout(timer)
  }, [busy])

  useEffect(() => {
    if (permission === null) {
      askedFor.current = null
      return
    }
    if (askedFor.current === permission.requestId) return
    askedFor.current = permission.requestId
    const nudge = nudgeFor({
      wanted,
      watching: watching(),
      reason: 'permission',
      tool: permission.toolName,
    })
    if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
  }, [permission, wanted])
}
