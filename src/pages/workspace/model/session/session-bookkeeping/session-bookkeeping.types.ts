import type { ExitReason } from '@/entities/claude-cli'

export type SessionClose = {
  reason: ExitReason | null
  stopped: boolean
}
