import type {
  ModelChoice,
  PermissionMode,
  RunConfig,
} from '@/entities/claude-cli/api/run-config/run-config.types'
import type { Person, RosterLock } from '@/entities/claude-cli/api/roster-lock/roster-lock.types'
import { NAMED_MODELS } from '@/entities/claude-cli/model/model-choice/model-choice'

const PERMISSION_MODES: readonly PermissionMode[] = ['ask', 'acceptEdits', 'bypass']
const MODELS: readonly ModelChoice[] = ['default', ...NAMED_MODELS]

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
    strings(one?.tools)
  )
}

function isLock(value: unknown): value is RosterLock | null {
  return value === null || strings((value as RosterLock)?.blockedAgents)
}

// The config came off the wire from the renderer, typed by the contract but not
// yet proven. Every value that becomes an argument to the CLI is read here
// before it does, the permission mode above all: 'bypass' is the one word that
// turns into --dangerously-skip-permissions.
export function runConfigOf(value: unknown): Omit<RunConfig, 'persona'> | null {
  const raw = value as Partial<RunConfig> | null
  if (raw === null || typeof raw !== 'object') return null
  if (!PERMISSION_MODES.includes(raw.permissionMode as PermissionMode)) return null
  if (!MODELS.includes(raw.model as ModelChoice)) return null
  if (raw.resume !== undefined && raw.resume !== null && typeof raw.resume !== 'string') return null
  if (!Array.isArray(raw.people) || !raw.people.every(isPerson)) return null
  if (!isLock(raw.lock)) return null
  return {
    permissionMode: raw.permissionMode as PermissionMode,
    model: raw.model as ModelChoice,
    resume: raw.resume ?? null,
    people: raw.people,
    lock: raw.lock,
  }
}
