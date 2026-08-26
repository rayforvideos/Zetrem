export type Person = {
  name: string
  description: string
  prompt: string
  model: string | null
  tools: string[]
}

export type RosterLock = {
  blockedAgents: string[]
}
