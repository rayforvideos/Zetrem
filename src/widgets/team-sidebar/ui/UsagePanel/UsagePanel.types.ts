import type { StatusState } from '@/entities/agent-session'

export type UsagePanelProps = {
  status: StatusState
  sessionLive: boolean
  avatar: number
}
