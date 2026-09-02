// Where a teammate is kept: 'user' is shared across every project, 'project'
// belongs to the open one alone. Both live in the app's own folder; neither is
// ever written into the project itself.
export type AgentSource = 'project' | 'user'

export type AgentDef = {
  character: string | null
  name: string
  description: string
  model: string | null
  tools: string[]
  knowledge: string[]
  prompt: string
  source: AgentSource
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
  source: AgentSource
  worktree: boolean
}
