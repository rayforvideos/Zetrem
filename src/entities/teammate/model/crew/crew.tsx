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

// A teammate we hired may name its own model; everyone else, the stock agents
// included, runs on whatever the session runs on. Answering null for those was
// read as "no model" and left the card blank about the one thing it was asked.
export function useModel(subagentType: string): string | null {
  const crew = useContext(CrewContext)
  return crew.members[subagentType]?.model ?? crew.fallbackModel
}
