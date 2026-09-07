export type Addressed = { toolUseId: string | null; taskId: string }

// Which of the two ids found the tile. The log says so, because a teammate
// matched by task id and one matched by tool id went wrong in different ways.
export type Match = { id: string; by: 'tool id' | 'task id' }
