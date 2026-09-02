import type { CharacterId } from '@/entities/teammate'

export type MemberFields = {
  name: string
  description: string
  prompt: string
  character: CharacterId
  worktree: boolean
  model?: string | null
  tools?: string[]
  knowledge?: string[]
}
