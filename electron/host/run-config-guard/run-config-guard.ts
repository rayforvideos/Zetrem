import type {
  EffortChoice,
  ModelChoice,
  PermissionMode,
  RunConfig,
} from '@/entities/claude-cli/api/run-config/run-config.types'
import type { Person, RosterLock } from '@/entities/claude-cli/api/roster-lock/roster-lock.types'
import { NAMED_MODELS } from '@/entities/claude-cli/model/model-choice/model-choice'
import { NAMED_EFFORTS } from '@/entities/claude-cli/model/effort-choice/effort-choice'

const PERMISSION_MODES: readonly PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODELS: readonly ModelChoice[] = ['default', ...NAMED_MODELS]
const EFFORTS: readonly EffortChoice[] = ['default', ...NAMED_EFFORTS]

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((one) => typeof one === 'string')
}

function isPerson(value: unknown): value is Person {
  const one = value as Person
  return (
    typeof one?.name === 'string' &&
    typeof one?.description === 'string' &&
    typeof one?.prompt === 'string' &&
    (one?.model === null || typeof one?.model === 'string') &&
    // Whether this teammate wants a worktree is the roster's answer, not main's:
    // main reads it to know who writes into the shared tree. A person that never
    // said is assumed to be fenced (isolated: true).
    (one?.isolated === undefined || typeof one?.isolated === 'boolean') &&
    strings(one?.tools)
  )
}

function isLock(value: unknown): value is RosterLock | null {
  return value === null || strings((value as RosterLock)?.blockedAgents)
}

// Every value here comes off the wire and becomes a CLI argument: 'bypass' is
// the word that turns into --dangerously-skip-permissions. Only what is named
// below survives, which is how `isolated` stays main's to decide: the worktree
// fence is the lock on the shared tree, and a renderer that could ask for it
// could ask for none.
export function runConfigOf(value: unknown): Omit<RunConfig, 'persona'> | null {
  const raw = value as Partial<RunConfig> | null
  if (raw === null || typeof raw !== 'object') return null
  if (!PERMISSION_MODES.includes(raw.permissionMode as PermissionMode)) return null
  if (!MODELS.includes(raw.model as ModelChoice)) return null
  if (!EFFORTS.includes(raw.effort as EffortChoice)) return null
  if (raw.resume !== undefined && raw.resume !== null && typeof raw.resume !== 'string') return null
  if (!Array.isArray(raw.people) || !raw.people.every(isPerson)) return null
  if (!isLock(raw.lock)) return null
  // The line naming the screen's language is text the teammates read, never
  // an argument of its own: it rides inside the --agents JSON.
  if (raw.spoken !== undefined && typeof raw.spoken !== 'string') return null
  return {
    permissionMode: raw.permissionMode as PermissionMode,
    model: raw.model as ModelChoice,
    effort: raw.effort as EffortChoice,
    resume: raw.resume ?? null,
    people: raw.people.map((p) => ({ ...p, isolated: p.isolated ?? true })),
    lock: raw.lock,
    ...(raw.spoken === undefined ? {} : { spoken: raw.spoken }),
  }
}
