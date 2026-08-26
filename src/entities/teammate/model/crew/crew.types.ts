export type CrewEntry = { character: string | null; model: string | null }

export type Crew = { members: Readonly<Record<string, CrewEntry>>; fallbackModel: string | null }
