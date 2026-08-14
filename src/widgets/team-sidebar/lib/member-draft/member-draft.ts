import type { AgentDefDraft } from '@/entities/agent-def'
import { characterOf, isCharacterId } from '@/entities/agent-session'
import type { CharacterId } from '@/entities/agent-session'

export function initialCharacter(initial: AgentDefDraft | null): CharacterId | null {
  return isCharacterId(initial?.character) ? initial.character : null
}

export function draftFrom(
  fields: { name: string; description: string; prompt: string; character: CharacterId },
  initial: AgentDefDraft | null,
): AgentDefDraft {
  return {
    name: fields.name.trim(),
    description: fields.description.trim(),
    model: initial?.model ?? null,
    character: fields.character,
    tools: initial?.tools ?? [],
    prompt: fields.prompt.trim(),
  }
}

export function characterFor(picked: CharacterId | null, name: string): CharacterId {
  return picked ?? characterOf(name)
}
