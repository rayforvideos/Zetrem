import { useCallback, useEffect, useState } from 'react'
import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'

export function useAgentDefs() {
  const [defs, setDefs] = useState<AgentDef[]>([])
  const [note, setNote] = useState<string | null>(null)

  const reload = useCallback(() => {
    window.desk
      .listAgentDefs()
      .then(setDefs)
      .catch((cause: unknown) => setNote(reasonOf(cause)))
  }, [])

  useEffect(reload, [reload])

  const hire = useCallback(
    (draft: AgentDefDraft) => {
      setNote(null)
      window.desk
        .writeAgentDef(draft)
        .then((path) => {
          reload()
          setNote(`Created — available in any project from the next session`)
        })
        .catch((cause: unknown) => setNote(reasonOf(cause)))
    },
    [reload],
  )

  return { defs, hire, note }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes('No handler registered')
    ? 'Restart Zetrem — this build does not know that yet'
    : text
}
