import type { AgentDefDraft } from '@/entities/agent-def'
import { characterOf, isCharacterId } from '@/entities/agent-session'
import type { CharacterId } from '@/entities/agent-session'
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
    ownCopy: fields.ownCopy ?? initial?.ownCopy ?? false,
    prompt: fields.prompt.trim(),
  }
}

export function characterFor(picked: CharacterId | null, name: string): CharacterId {
  return picked ?? characterOf(name)
}

export function toggled(held: string[], name: string, on: boolean): string[] {
  const without = held.filter((entry) => entry !== name)
  return on ? [...without, name] : without
}

export function toolSummary(chosen: string[], known: string[]): string {
  if (known.length === 0) return 'Not known yet'
  if (chosen.length === 0) return 'Everything the session has'
  return `${chosen.length} of ${known.length}`
}
