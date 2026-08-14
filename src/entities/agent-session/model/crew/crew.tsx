import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Crew } from './crew.types'

const EMPTY: Crew = { members: {}, fallbackModel: null }

const CrewContext = createContext<Crew>(EMPTY)

export function CrewProvider({ crew, children }: { crew: Crew; children: ReactNode }) {
  return <CrewContext.Provider value={crew}>{children}</CrewContext.Provider>
}

export function useFace(subagentType: string): string | null {
  return useContext(CrewContext).members[subagentType]?.character ?? null
}

export function useModel(subagentType: string): string | null {
  const crew = useContext(CrewContext)
  const entry = crew.members[subagentType]
  if (entry === undefined) return null
  return entry.model ?? crew.fallbackModel
}
