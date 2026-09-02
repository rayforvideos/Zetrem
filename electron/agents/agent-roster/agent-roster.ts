import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { AgentDef, AgentDefDraft, AgentSource } from '@/entities/agent-def'
import {
  listAgentDefs,
  removeAgentDef,
  replaceAgentDef,
  writeAgentDef,
} from '../agent-store/agent-store'
import type { RosterDirs } from './agent-roster.types'

// One team, kept in two places: the people shared across every project, and
// the people this project alone knows. Both folders belong to the app; the
// project's own repository is never written to.

function dirOf(dirs: RosterDirs, source: AgentSource): string | null {
  return source === 'project' ? dirs.project : dirs.user
}

function otherThan(source: AgentSource): AgentSource {
  return source === 'project' ? 'user' : 'project'
}

const same = (one: string, two: string): boolean => one.toLowerCase() === two.toLowerCase()

// The project's own people come second so they win the name: opening a project
// is how you say which version of someone you mean today.
export async function readRoster(dirs: RosterDirs): Promise<AgentDef[]> {
  const shared = await listAgentDefs(dirs.user, 'user')
  const here = dirs.project === null ? [] : await listAgentDefs(dirs.project, 'project')
  const shadowed = shared.filter((def) => !here.some((mine) => same(mine.name, def.name)))
  return [...shadowed, ...here].sort((a, b) => a.name.localeCompare(b.name))
}

// Two people of the same name in two scopes: one of them would be invisible,
// and neither the roster nor the orchestrator could tell which was meant.
async function takenElsewhere(
  dirs: RosterDirs,
  draft: AgentDefDraft,
  spared: string | null,
): Promise<boolean> {
  const source = otherThan(draft.source)
  const dir = dirOf(dirs, source)
  if (dir === null) return false
  const defs = await listAgentDefs(dir, source)
  return defs.some(
    (def) => same(def.name, draft.name) && (spared === null || !same(def.name, spared)),
  )
}

export async function writeToRoster(
  dirs: RosterDirs,
  draft: AgentDefDraft,
): Promise<Outcome<string>> {
  const dir = dirOf(dirs, draft.source)
  if (dir === null) return lost('unsupported', draft.name)
  if (await takenElsewhere(dirs, draft, null)) return lost('refused', draft.name)
  return won(await writeAgentDef(dir, draft))
}

export async function removeFromRoster(
  dirs: RosterDirs,
  name: string,
  source: AgentSource,
): Promise<Outcome<void>> {
  const dir = dirOf(dirs, source)
  if (dir === null) return won(undefined)
  await removeAgentDef(dir, name)
  return won(undefined)
}

// Changing scope is a move: written into the new folder, taken out of the old.
export async function replaceInRoster(
  dirs: RosterDirs,
  draft: AgentDefDraft,
  previousName: string,
  previousSource: AgentSource,
): Promise<Outcome<string>> {
  const dir = dirOf(dirs, draft.source)
  if (dir === null) return lost('unsupported', draft.name)
  // The entry being moved sits in the other scope until this write finishes:
  // it is the one name there that is not somebody else. Editing it in place —
  // same scope, same name — creates no new ambiguity: the other scope already
  // held that name before this write, and still does after it, so there is
  // nothing to refuse.
  const inPlace = previousSource === draft.source && same(previousName, draft.name)
  const spared = previousSource === draft.source ? (inPlace ? previousName : null) : previousName
  if (!inPlace && (await takenElsewhere(dirs, draft, spared))) return lost('refused', draft.name)

  if (previousSource === draft.source) return won(await replaceAgentDef(dir, draft, previousName))

  const path = await writeAgentDef(dir, draft)
  await removeFromRoster(dirs, previousName, previousSource)
  return won(path)
}
