import { useCallback, useEffect, useState } from 'react'
import type { AgentDef, AgentDefDraft, AgentSource } from '@/entities/agent-def'
import type { TeamNote } from '@/widgets/team-sidebar'
import type { Outcome, Why } from '@/shared/lib/outcome/outcome.types'
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

// Half the team is kept for the open project, so opening another one is a
// different roster: the roster is a function of the path, and the list is
// read again whenever it changes.
export function useAgentDefs(projectPath: string | null): TeamSource {
  const [defs, setDefs] = useState<AgentDef[]>([])
  const [note, setNote] = useState<TeamNote | null>(null)

  function reload(): void {
    window.desk
      .listAgentDefs()
      .then(setDefs)
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  // A fast project switch can fire two reads whose replies land out of order;
  // without a guard the older project's roster would land last and stick. A
  // note from the project just left must not linger either.
  useEffect(() => {
    let live = true
    setNote(null)
    window.desk
      .listAgentDefs()
      .then((got) => {
        if (live) setDefs(got)
      })
      .catch((cause: unknown) => {
        if (live) setNote({ kind: 'trouble', text: reasonOf(cause) })
      })
    return () => {
      live = false
    }
  }, [projectPath])

  // Nobody is kept twice, so the scope someone is in now is the scope the
  // roster says they are in.
  function scopeOf(name: string): AgentSource {
    return defs.find((def) => def.name === name)?.source ?? 'user'
  }

  function errand(work: () => Promise<Outcome<unknown>>, done: TeamNote): void {
    setNote(null)
    work()
      .then((answer) => {
        reload()
        setNote(answer.ok ? done : refusalOf(answer.why))
      })
      .catch((cause: unknown) => setNote({ kind: 'trouble', text: reasonOf(cause) }))
  }

  function hire(draft: AgentDefDraft): void {
    errand(() => window.desk.writeAgentDef(draft), { kind: 'created', name: draft.name })
  }

  // Letting someone go cannot be refused: they are already on the roster, so
  // the scope they are in is the scope they leave from.
  function release(name: string): void {
    errand(() => window.desk.removeAgentDef(name, scopeOf(name)), { kind: 'released', name })
  }

  function edit(draft: AgentDefDraft, previousName: string): void {
    errand(() => window.desk.replaceAgentDef(draft, previousName, scopeOf(previousName)), {
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
        source: def.source,
      },
    ]),
  )

  // Stable on purpose: the screen clears the note from an effect keyed on the
  // session, and a fresh function every render would wipe it before it is read.
  const settleNote = useCallback(() => setNote(null), [])

  return { defs, drafts, hire, edit, release, note, settleNote }
}

// Main names the reason and hands back the evidence; the words are written here.
function refusalOf(why: Why): TeamNote {
  if (why.code === 'refused') return { kind: 'taken', name: why.said }
  if (why.code === 'unsupported')
    return { kind: 'trouble', text: t`Open a project before keeping someone for it.` }
  return { kind: 'trouble', text: why.said }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes(t`No handler registered`)
    ? t`Restart Zetrem. This version does not know about it yet.`
    : text
}
