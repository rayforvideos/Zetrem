import type { WorkOutcome } from '@/entities/agent-session'

export function leftBehind(outcome: WorkOutcome): string {
  const parts: string[] = []
  if (outcome.commits > 0) {
    parts.push(outcome.commits === 1 ? '1 commit' : `${outcome.commits} commits`)
  }
  if (outcome.dirtyFiles > 0) {
    parts.push(outcome.dirtyFiles === 1 ? '1 file not committed' : `${outcome.dirtyFiles} files not committed`)
  }
  if (parts.length === 0) return `Left nothing on ${outcome.branch}`
  return `Left ${parts.join(' and ')} on ${outcome.branch}`
}
