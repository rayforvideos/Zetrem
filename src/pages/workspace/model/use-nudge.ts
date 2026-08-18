import { useEffect, useRef } from 'react'
import { nudgeFor } from '@/entities/agent-session'
import type { PermissionAsk, SessionStatus } from '@/entities/agent-session'

function watching(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

export function useNudge(
  wanted: boolean,
  status: SessionStatus,
  permission: PermissionAsk | null,
): void {
  const wasWorking = useRef(false)
  const askedFor = useRef<string | null>(null)

  useEffect(() => {
    const working = status === 'working'
    const settled = wasWorking.current && !working
    wasWorking.current = working
    if (!settled) return
    const nudge = nudgeFor({
      wanted,
      watching: watching(),
      reason: 'done',
      tool: '',
      asked: permission !== null,
    })
    if (nudge !== null) window.desk.nudge(nudge.title, nudge.body)
  }, [status, wanted, permission])

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
