import type { Person, RosterLock } from './roster-lock.types'

export const ORCHESTRATOR = 'zetrem'

const ELSEWHERE = [
  'Workflow',
  'ListAgents',
  'CronCreate',
  'CronDelete',
  'CronList',
  'ScheduleWakeup',
  'RemoteTrigger',
]

// The names the CLI's own write-capable generic agents answer to. A definition
// under either name replaces that built-in, which is the only way to reach one:
// built-ins are outside the roster and so carry no isolation of their own.
const GENERIC = ['claude', 'general-purpose']

const GENERIC_HELPER = {
  description: 'A general helper for handed-off work',
  prompt:
    'You are a general helper. Do the task handed to you, and report back what you did and what you found.',
}

type Spec = Record<
  string,
  {
    description: string
    prompt: string
    model?: string
    tools?: string[]
    isolation?: 'worktree'
  }
>

// Declared on the definition rather than asked for at the call: the runtime then
// fences every spawn of that teammate, whatever the orchestrator passes.
export function peopleSpec(people: Person[], isolated: boolean): Spec {
  const spec: Spec = {}
  for (const person of people) {
    if (person.name.length === 0 || person.prompt.trim().length === 0) continue
    // Naming tools makes the list exhaustive: the teammate loses everything not named, so an
    // empty pick is left off entirely.
    spec[person.name] = {
      description: person.description.length > 0 ? person.description : person.name,
      prompt: person.prompt,
      ...(person.model === null ? {} : { model: person.model }),
      ...(person.tools.length === 0 ? {} : { tools: person.tools }),
      ...(isolated ? { isolation: 'worktree' as const } : {}),
    }
  }
  return spec
}

export function agentsArgs(
  people: Person[],
  lock: RosterLock | null,
  orchestratorPrompt: string,
  isolated: boolean,
): string[] {
  const spec = peopleSpec(people, isolated)

  if (lock === null) {
    return Object.keys(spec).length === 0 ? [] : ['--agents', JSON.stringify(spec)]
  }

  // Someone hired under one of these names is who the orchestrator meant, so
  // the injection only fills a name the roster left open.
  if (isolated) {
    for (const name of GENERIC) {
      if (name in spec) continue
      spec[name] = { ...GENERIC_HELPER, isolation: 'worktree' as const }
    }
  }

  // Never isolated: the orchestrator is the one writer of the shared tree, and
  // the one that merges what comes back from the worktrees into it.
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
