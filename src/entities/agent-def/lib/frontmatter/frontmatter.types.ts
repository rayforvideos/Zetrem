export type AgentDef = {
  character: string | null
  name: string
  description: string
  model: string | null
  tools: string[]
  prompt: string
  source: 'project' | 'user'
  path: string
}

export type AgentDefDraft = {
  character: string | null
  name: string
  description: string
  model: string | null
  tools: string[]
  prompt: string
}
