export type AgentDef = {
  character: string | null
  name: string
  description: string
  model: string | null
  tools: string[]
  knowledge: string[]
  prompt: string
  source: 'project' | 'user'
  path: string
  worktree: boolean
}

export type AgentDefDraft = {
  character: string | null
  name: string
  description: string
  model: string | null
  tools: string[]
  knowledge: string[]
  prompt: string
  worktree: boolean
}
