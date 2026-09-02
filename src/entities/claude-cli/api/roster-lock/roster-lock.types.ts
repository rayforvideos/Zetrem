export type Person = {
  name: string
  description: string
  prompt: string
  model: string | null
  tools: string[]
  isolated: boolean
}

export type RosterLock = {
  blockedAgents: string[]
}
