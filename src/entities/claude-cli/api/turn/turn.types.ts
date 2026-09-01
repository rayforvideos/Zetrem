import type { ModelChoice } from '../../model/model-choice/model-choice.types'
import type { ChildTurnEvent } from '../child/child.types'

export type TurnEvent =
  | { type: 'headline'; text: string }
  | { type: 'stream'; line: string; toolUseId: string | null; input: unknown }
  | { type: 'turnEnded' }
  | { type: 'notice'; text: string; refused?: ModelChoice }
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | {
      type: 'toolResult'
      toolUseId: string
      stdout: string
      stderr: string
      isError: boolean
      interrupted: boolean
      // The runtime's id for a subagent that ran isolated, said only here.
      agentId?: string
    }
  | Extract<ChildTurnEvent, { type: 'childOpen' }>
