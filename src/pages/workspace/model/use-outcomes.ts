import { useEffect, useRef } from 'react'
import { sessionStore } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'

export function useOutcomes(children: AgentSession[]): void {
  const asked = useRef(new Set<string>())

  useEffect(() => {
    for (const child of children) {
      if (child.status !== 'done' && child.status !== 'reported') continue
      if (child.taskId === undefined || child.outcome !== undefined) continue
      if (asked.current.has(child.id)) continue
      asked.current.add(child.id)
      void window.desk
        .readOutcome(child.taskId)
        .then((outcome) => sessionStore.patch(child.id, { outcome }))
        .catch(() => sessionStore.patch(child.id, { outcome: null }))
    }
  }, [children])
}
