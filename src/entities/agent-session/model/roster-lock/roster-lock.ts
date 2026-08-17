import type { Person, RosterLock } from './roster-lock.types'

export const ORCHESTRATOR = 'zetrem'

const ELSEWHERE = [
  'Workflow',
  'SendMessage',
  'ListAgents',
  'CronCreate',
  'CronDelete',
  'CronList',
  'ScheduleWakeup',
  'RemoteTrigger',
]

type Spec = Record<string, { description: string; prompt: string; model?: string }>

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
