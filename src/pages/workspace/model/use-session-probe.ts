import { useEffect, useRef } from 'react'
import type { RunConfig } from '@/entities/agent-session'
import { learnSession, learnUsage } from './session-probe/session-probe'

export function useSessionProbe(config: Omit<RunConfig, 'persona'>, wanted: boolean): void {
  const held = useRef(config)
  held.current = config
  useEffect(() => {
    if (!wanted) return
    void window.desk.probeSession(held.current).then(learnSession).catch(() => undefined)
    void window.desk.sessionUsage().then(learnUsage).catch(() => undefined)
  }, [wanted])
}
