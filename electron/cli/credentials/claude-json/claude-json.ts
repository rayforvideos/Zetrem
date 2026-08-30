import { join } from 'node:path'
import type { CredentialSnapshot } from '../credentials.types'

export function configDirOf(env: Record<string, string | undefined>, home: string): string {
  const set = env.CLAUDE_CONFIG_DIR
  return set !== undefined && set.length > 0 ? set : join(home, '.claude')
}

// The tokens live in the config dir, but the name beside them does not.
// Claude Code keeps .claude.json in the home root and only moves it into
// CLAUDE_CONFIG_DIR when that is set — so ~/.claude/.claude.json is a file it
// never reads, and a name written there leaves `claude auth status` echoing
// whoever was signed in before.
export function labelPathOf(env: Record<string, string | undefined>, home: string): string {
  const set = env.CLAUDE_CONFIG_DIR
  return join(set !== undefined && set.length > 0 ? set : home, '.claude.json')
}

function parsed(text: string | null): Record<string, unknown> {
  if (text === null) return {}
  try {
    const value: unknown = JSON.parse(text)
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function oauthAccountOf(text: string | null): unknown {
  return parsed(text).oauthAccount ?? null
}

// Claude Code keeps what the signed-in account may do — its plan, its models,
// its limits — beside oauthAccount in the same file. These are the keys seen
// in a real one. Zetrem cannot recompute any of them and the snapshot it files
// does not carry them, so a switch drops them and the CLI asks for the
// arriving account's own on the next run. userID is not among them: it names
// the install, not the login, the way machineID and anonymousId do, and
// re-rolling it would move this machine's experiment buckets and show its
// one-time notices again.
const ACCOUNT_KEYS = new Set([
  'additionalModelCostsCache',
  'additionalModelOptionsCache',
  'autoCompactWindowsCache',
  'cachedExtraUsageDisabledReason',
  'cachedUsageUtilization',
  'clientDataCacheSlots',
  'fableOverageConsent',
  'groveConfigCache',
  'hasAvailableSubscription',
  'metricsStatusCache',
  'modelAccessCache',
  'orgModelDefaultCache',
  'overageCreditGrantCache',
  'passesEligibilityCache',
  'passesLastSeenCampaign',
  'passesLastSeenRemaining',
  'penguinModeOrgEnabled',
  's1mAccessCache',
  'subscriptionNoticeCount',
])

// The CLI adds these faster than a list can follow it, so the shape of the
// name is read too: anything it called a cache, and anything it cached per
// experiment or feature flag, was computed for one account. Nothing else is
// touched — projects is the user's own history, and a key about this machine
// says nothing about who is signed in.
function accountScoped(key: string): boolean {
  if (ACCOUNT_KEYS.has(key)) return true
  if (key.endsWith('Cache')) return true
  return key.startsWith('cachedExperiment') || key.startsWith('cachedGrowthBookFeatures')
}

function uuidOf(account: unknown): string | null {
  if (account === null || typeof account !== 'object') return null
  const { accountUuid } = account as Record<string, unknown>
  return typeof accountUuid === 'string' ? accountUuid : null
}

// The caches belong to an account, not to a write. Putting back the account
// that is already here — a rollback after a cancelled login, a switch to the
// row the machine already holds, a re-auth of the same login — costs it its
// caches for nothing. An account the file cannot name is not the same one.
function sameAccount(held: unknown, arriving: unknown): boolean {
  const was = uuidOf(held)
  return was !== null && was === uuidOf(arriving)
}

export function withOauthAccount(text: string | null, value: unknown): string {
  const file = parsed(text)
  const staying = sameAccount(file.oauthAccount, value)
  const rest: Record<string, unknown> = {}
  for (const [key, held] of Object.entries(file)) {
    if (key === 'oauthAccount') continue
    if (!staying && accountScoped(key)) continue
    rest[key] = held
  }
  const next = value === null ? rest : { ...rest, oauthAccount: value }
  return JSON.stringify(next, null, 2)
}

export function rowOf(
  snapshot: CredentialSnapshot,
): { email: string; orgName: string | null; accountUuid: string } | null {
  if (snapshot.credentials === null) return null
  const account = snapshot.oauthAccount
  if (account === null || typeof account !== 'object') return null
  const { accountUuid, emailAddress, organizationName } = account as Record<string, unknown>
  if (typeof accountUuid !== 'string' || typeof emailAddress !== 'string') return null
  return {
    email: emailAddress,
    orgName: typeof organizationName === 'string' ? organizationName : null,
    accountUuid,
  }
}
