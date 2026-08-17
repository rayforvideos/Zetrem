export type SessionFacts = {
  tools: string[] | undefined
  agents: string[] | undefined
  probed: boolean
}

export type Remembered = {
  knownTools: string[]
  knownAgents: string[]
}
