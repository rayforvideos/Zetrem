import { parseClaudeLine, readUsage, statusStore } from '@/entities/agent-session'

export function learnSession(line: string | null): void {
  if (line === null) return
  if (statusStore.get().session !== null) return
  for (const turn of parseClaudeLine(line)) {
    if (turn.type === 'session') statusStore.apply(turn)
  }
}

export function learnUsage(report: string | null): void {
  if (report === null) return
  for (const limit of readUsage(report)) {
    statusStore.apply({ type: 'limit', limit })
  }
}
