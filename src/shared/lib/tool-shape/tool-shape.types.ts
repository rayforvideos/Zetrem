export type ToolShape =
  | { kind: 'file'; verb: 'read' | 'write' | 'edit'; dir: string; name: string }
  | { kind: 'command'; command: string }
  | { kind: 'search'; pattern: string; scope: string }
  | { kind: 'web'; label: string }
  | { kind: 'agent'; subagentType: string; description: string }
  | { kind: 'todo' }
  | { kind: 'plain'; name: string }
