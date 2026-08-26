// What a crew event carries that can point at a teammate: the tool_use that
// spawned them, the task the CLI gave them, or neither.
export type Addressed = { toolUseId: string | null; taskId: string }
