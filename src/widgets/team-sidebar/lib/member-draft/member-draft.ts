import { t } from '@lingui/core/macro'
import type { AgentDefDraft } from '@/entities/agent-def'
import { DEFAULT_CHARACTER, isCharacterId } from '@/entities/teammate'
import type { CharacterId } from '@/entities/teammate'
import type { MemberFields } from './member-draft.types'

export function initialCharacter(initial: AgentDefDraft | null): CharacterId | null {
  return isCharacterId(initial?.character) ? initial.character : null
}

export function draftFrom(fields: MemberFields, initial: AgentDefDraft | null): AgentDefDraft {
  return {
    name: fields.name.trim(),
    description: fields.description.trim(),
    model: fields.model ?? initial?.model ?? null,
    character: fields.character,
    tools: fields.tools ?? initial?.tools ?? [],
    knowledge: fields.knowledge ?? initial?.knowledge ?? [],
    prompt: fields.prompt.trim(),
  }
}

export function characterFor(picked: CharacterId | null): CharacterId {
  return picked ?? DEFAULT_CHARACTER
}

export function toggled(held: string[], name: string, on: boolean): string[] {
  const without = held.filter((entry) => entry !== name)
  return on ? [...without, name] : without
}

export function toolSummary(chosen: string[], known: string[]): string {
  if (known.length === 0) return t`Not known yet`
  if (chosen.length === 0) return t`Everything the session has`
  return `${chosen.length} of ${known.length}`
}
