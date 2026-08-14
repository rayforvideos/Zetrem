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
        .then(() => {
          reload()
          setNote('Created — available in any project from the next session')
        })
        .catch((cause: unknown) => setNote(reasonOf(cause)))
    },
    [reload],
  )

  const release = useCallback(
    (name: string) => {
      setNote(null)
      window.desk
        .removeAgentDef(name)
        .then(() => {
          reload()
          setNote(`${name} left the team — running sessions keep them until they end`)
        })
        .catch((cause: unknown) => setNote(reasonOf(cause)))
    },
    [reload],
  )

  const edit = useCallback(
    (draft: AgentDefDraft, previousName: string) => {
      setNote(null)
      window.desk
        .replaceAgentDef(draft, previousName)
        .then(() => {
          reload()
          setNote(`${draft.name} updated — applies from the next session`)
        })
        .catch((cause: unknown) => setNote(reasonOf(cause)))
    },
    [reload],
  )

  const drafts = new Map<string, AgentDefDraft>(
    defs.map((def) => [
      def.name,
      {
        name: def.name,
        description: def.description,
        model: def.model,
        character: def.character,
        tools: def.tools,
        prompt: def.prompt,
      },
    ]),
  )

  return { defs, drafts, hire, edit, release, note }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes('No handler registered')
    ? 'Restart Zetrem — this build does not know that yet'
    : text
}
