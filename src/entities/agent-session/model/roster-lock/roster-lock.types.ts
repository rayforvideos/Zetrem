export type Person = {
  name: string
  description: string
  prompt: string
  model: string | null
}

export type RosterLock = {
  knownTools: string[]
}
