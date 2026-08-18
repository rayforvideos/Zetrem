import type { CharacterId } from '@/entities/agent-session'

export type MemberFields = {
  name: string
  description: string
  prompt: string
  character: CharacterId
  model?: string | null
  tools?: string[]
  knowledge?: string[]
}
