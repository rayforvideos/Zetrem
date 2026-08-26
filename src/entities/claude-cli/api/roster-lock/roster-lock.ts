import type { Person, RosterLock } from './roster-lock.types'

export const ORCHESTRATOR = 'zetrem'

// Tools that belong to a Claude Code that runs itself, not to a session a
// person is watching. SendMessage is not among them: a teammate handing work
// to another teammate is the point, and the board draws that exchange.
const ELSEWHERE = [
  'Workflow',
  'ListAgents',
  'CronCreate',
  'CronDelete',
  'CronList',
  'ScheduleWakeup',
  'RemoteTrigger',
]

type Spec = Record<
  string,
  { description: string; prompt: string; model?: string; tools?: string[] }
>

export function peopleSpec(people: Person[]): Spec {
  const spec: Spec = {}
  for (const person of people) {
    if (person.name.length === 0 || person.prompt.trim().length === 0) continue
    // Naming tools makes the list exhaustive: the teammate loses everything not
    // named. An empty pick means "whatever the session has", so it stays off.
    spec[person.name] = {
      description: person.description.length > 0 ? person.description : person.name,
      prompt: person.prompt,
      ...(person.model === null ? {} : { model: person.model }),
      ...(person.tools.length === 0 ? {} : { tools: person.tools }),
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

  if (lock === null) {
    return Object.keys(spec).length === 0 ? [] : ['--agents', JSON.stringify(spec)]
  }

  spec[ORCHESTRATOR] = {
    description: 'The orchestrator Zetrem runs',
    prompt: orchestratorPrompt,
  }

  const barred = [...ELSEWHERE, ...lock.blockedAgents.map((name) => `Agent(${name})`)]
  return [
    '--agents',
    JSON.stringify(spec),
    '--agent',
    ORCHESTRATOR,
    '--disallowedTools',
    barred.join(','),
  ]
}
