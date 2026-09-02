import { useEffect, useRef } from 'react'
import { nudgeFor } from '@/entities/agent-session'
import type { PermissionAsk } from '@/entities/agent-session'
import { settledNow } from './settle-nudge/settle-nudge'

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

  useEffect(() => {
    const settled = settledNow(wasBusy.current, busy)
    wasBusy.current = busy
    if (!settled) return
    const nudge = nudgeFor({
      wanted,
      watching: watching(),
      reason: 'done',
      tool: '',
      asked: permission !== null,
      trouble,
    })
    if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
  }, [busy, wanted, permission, trouble])

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
