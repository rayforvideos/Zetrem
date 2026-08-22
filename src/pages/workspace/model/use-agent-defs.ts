import { useEffect, useState } from 'react'
import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'
import type { TeamNote } from '@/widgets/team-sidebar'
import { t } from '@lingui/core/macro'

export function useAgentDefs() {
  const [defs, setDefs] = useState<AgentDef[]>([])
  const [note, setNote] = useState<TeamNote | null>(null)

  function reload(): void {
    window.desk
      .listAgentDefs()
      .then(setDefs)
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  useEffect(reload, [])

  function hire(draft: AgentDefDraft): void {
    setNote(null)
    window.desk
      .writeAgentDef(draft)
      .then(() => {
        reload()
        setNote({ kind: 'created', name: draft.name })
      })
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  function release(name: string): void {
    setNote(null)
    window.desk
      .removeAgentDef(name)
      .then(() => {
        reload()
        setNote({ kind: 'released', name })
      })
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  function edit(draft: AgentDefDraft, previousName: string): void {
    setNote(null)
    window.desk
      .replaceAgentDef(draft, previousName)
      .then(() => {
        reload()
        setNote({ kind: 'updated', name: draft.name })
      })
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  const drafts = new Map<string, AgentDefDraft>(
    defs.map((def) => [
      def.name,
      {
        name: def.name,
        description: def.description,
        model: def.model,
        character: def.character,
        tools: def.tools,
        knowledge: def.knowledge,
        prompt: def.prompt,
      },
    ]),
  )

  return { defs, drafts, hire, edit, release, note }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes(t`No handler registered`)
    ? t`Restart Zetrem. This version does not know about it yet.`
    : text
}
