import type { ChildTurnEvent } from './child.types'

export type TurnEvent =
  | { type: 'headline'; text: string }
  | { type: 'stream'; line: string; toolUseId: string | null; input: unknown }
  | { type: 'turnEnded' }
  | { type: 'notice'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'toolResult'; toolUseId: string; stdout: string; stderr: string; isError: boolean; interrupted: boolean }
  | Extract<ChildTurnEvent, { type: 'childOpen' }>
