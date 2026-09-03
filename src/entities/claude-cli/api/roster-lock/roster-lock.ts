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

// A fresh worktree has no node_modules of its own; main links the checkout's in
// (symlinked, not copied) where there is one to link. Said as a condition because
// a project may have none, and the link can be skipped or fail - a flat claim
// would then be a lie, while the rule it carries holds either way.
const WORKTREE_NODE_MODULES_NOTICE =
  '\n\nYou work in a git worktree of your own. If a node_modules folder is present there, it is linked from the main checkout: never install, update or remove dependencies inside the worktree.'

// A teammate's own definition is what it speaks, and the stock ones are
// English, so its running narration drifts to English whatever the person
// reads the app in. The screen hands over a line naming its language, and
// every teammate's brief opens with it: a rule at the end of a long brief
// was read past, and the first sentence came out in English anyway. The
// main process cannot read the dictionary itself, so the line arrives as text.
function spoken(prompt: string, line: string | undefined): string {
  return line === undefined || line.length === 0 ? prompt : `${line}\n\n${prompt}`
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

function withNotice(prompt: string): string {
  return `${prompt}${WORKTREE_NODE_MODULES_NOTICE}`
}

// Declared on the definition rather than asked for at the call: the runtime then
// fences every spawn of that teammate, whatever the orchestrator passes. Only a
// teammate that opted in is fenced, and only when the workspace can hold worktrees at all.
export function peopleSpec(people: Person[], isolated: boolean, spokenLine?: string): Spec {
  const spec: Spec = {}
  for (const person of people) {
    if (person.name.length === 0 || person.prompt.trim().length === 0) continue
    const fenced = isolated && person.isolated
    // Naming tools makes the list exhaustive: the teammate loses everything not named, so an
    // empty pick is left off entirely.
    spec[person.name] = {
      description: person.description.length > 0 ? person.description : person.name,
      prompt: spoken(fenced ? withNotice(person.prompt) : person.prompt, spokenLine),
      ...(person.model === null ? {} : { model: person.model }),
      ...(person.tools.length === 0 ? {} : { tools: person.tools }),
      ...(fenced ? { isolation: 'worktree' as const } : {}),
    }
  }
  return spec
}

export function agentsArgs(
  people: Person[],
  lock: RosterLock | null,
  orchestratorPrompt: string,
  isolated: boolean,
  spokenLine?: string,
): string[] {
  const spec = peopleSpec(people, isolated, spokenLine)

  if (lock === null) {
    return Object.keys(spec).length === 0 ? [] : ['--agents', JSON.stringify(spec)]
  }

  // Someone hired under one of these names is who the orchestrator meant, so
  // the injection only fills a name the roster left open.
  if (isolated) {
    for (const name of GENERIC) {
      if (name in spec) continue
      spec[name] = {
        ...GENERIC_HELPER,
        prompt: spoken(withNotice(GENERIC_HELPER.prompt), spokenLine),
        isolation: 'worktree' as const,
      }
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
