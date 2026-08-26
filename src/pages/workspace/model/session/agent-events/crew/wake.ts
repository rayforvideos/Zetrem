import { sessionStore } from '@/entities/agent-session'

// A child that spoke is working again, whatever we had last written on it.
export function wake(toolUseId: string): void {
  const status = sessionStore.find(toolUseId)?.status
  if (status === undefined || status === 'working') return
  sessionStore.patch(toolUseId, { status: 'working', endedAtMs: undefined })
}
