export type AgentDef = {
  name: string
  description: string
  model: string | null
  tools: string[]
  prompt: string
  source: 'project' | 'user'
  path: string
}

export type AgentDefDraft = {
  name: string
  description: string
  model: string | null
  tools: string[]
  prompt: string
}
