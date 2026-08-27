import type { AgentDefDraft } from '@/entities/agent-def'
import type { TeamNote } from '../../lib/team-note/team-note.types'
import type { TeamMember } from '../../lib/team/team.types'

export type TeamListProps = {
  members: TeamMember[]
  drafts: Map<string, AgentDefDraft>
  knownTools: string[]
  // Not "a session id is known": the probe keeps reporting one after a restart has
  // already killed ours.
  sessionUp: boolean
  read: string[]
  canWrite: boolean
  hint: boolean
  note: TeamNote | null
  avatar: number
  onHire(draft: AgentDefDraft): void
  onEdit(draft: AgentDefDraft, previousName: string): void
  onRelease(name: string): void
  onPick(sessionId: string): void
  onAddress(subagentType: string): void
  onRestart(): void
  onHintSeen(): void
}
