import type { Person, RosterLock } from './roster-lock.types'

export const ORCHESTRATOR = 'zetrem'

type Spec = Record<string, { description: string; prompt: string; model?: string; tools?: string[] }>

export function peopleSpec(people: Person[]): Spec {
  const spec: Spec = {}
  for (const person of people) {
    if (person.name.length === 0 || person.prompt.trim().length === 0) continue
    spec[person.name] = {
      description: person.description.length > 0 ? person.description : person.name,
      prompt: person.prompt,
      ...(person.model === null ? {} : { model: person.model }),
    }
  }
  return spec
}

export function agentsArgs(
  people: Person[],
  lock: RosterLock | null,
  orchestratorPrompt: string,
): string[] {
  const spec = peopleSpec(people)
  const names = Object.keys(spec)
  const locking = lock !== null && names.length > 0 && lock.knownTools.length > 0

  if (locking) {
    const tools = lock.knownTools.filter((name) => name !== 'Task' && !name.startsWith('Agent('))
    spec[ORCHESTRATOR] = {
      description: 'The orchestrator Zetrem runs',
      prompt: orchestratorPrompt,
      tools: [...tools, `Agent(${names.join(', ')})`],
    }
  }

  if (Object.keys(spec).length === 0) return []
  const args = ['--agents', JSON.stringify(spec)]
  return locking ? [...args, '--agent', ORCHESTRATOR] : args
}
