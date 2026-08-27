import { useCallback, useEffect, useState } from 'react'
import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'
import type { TeamNote } from '@/widgets/team-sidebar'
import { t } from '@lingui/core/macro'

type TeamSource = {
  defs: AgentDef[]
  drafts: Map<string, AgentDefDraft>
  hire(draft: AgentDefDraft): void
  edit(draft: AgentDefDraft, previousName: string): void
  release(name: string): void
  note: TeamNote | null
  settleNote(): void
}

export function useAgentDefs(): TeamSource {
  const [defs, setDefs] = useState<AgentDef[]>([])
  const [note, setNote] = useState<TeamNote | null>(null)

  function reload(): void {
    window.desk
      .listAgentDefs()
      .then(setDefs)
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  useEffect(reload, [])

  function errand(work: () => Promise<unknown>, done: TeamNote): void {
    setNote(null)
    work()
      .then(() => {
        reload()
        setNote(done)
      })
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  function hire(draft: AgentDefDraft): void {
    errand(() => window.desk.writeAgentDef(draft), { kind: 'created', name: draft.name })
  }

  function release(name: string): void {
    errand(() => window.desk.removeAgentDef(name), { kind: 'released', name })
  }

  function edit(draft: AgentDefDraft, previousName: string): void {
    errand(() => window.desk.replaceAgentDef(draft, previousName), {
      kind: 'updated',
      name: draft.name,
    })
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

  // Stable on purpose: the screen clears the note from an effect keyed on the
  // session, and a fresh function every render would wipe it before it is read.
  const settleNote = useCallback(() => setNote(null), [])

  return { defs, drafts, hire, edit, release, note, settleNote }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes(t`No handler registered`)
    ? t`Restart Zetrem. This version does not know about it yet.`
    : text
}
