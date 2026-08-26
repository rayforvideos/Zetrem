import type { SessionStatus } from '@/entities/agent-session'

export function maySave(at: {
  ready: boolean
  project: string | null
  loadedFor: string | null
  openId: string | null
  status: SessionStatus
  turnCount: number
}): boolean {
  if (!at.ready || at.project === null || at.openId === null) return false
  if (at.loadedFor !== at.project) return false
  if (at.status === 'working' || at.turnCount === 0) return false
  return true
}

export function threadToSave(at: {
  liveSessionId: string | null
  probed: boolean
  resumeId: string | null
}): string | null {
  if (at.probed) return at.resumeId
  return at.liveSessionId ?? at.resumeId
}
