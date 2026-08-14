export type ChildTurnEvent =
  | {
      type: 'childOpen'
      toolUseId: string
      label: string
      subagentType: string
      prompt: string
      background: boolean
    }
  | { type: 'childSay'; toolUseId: string; role: 'user' | 'assistant'; text: string }
  | { type: 'childStream'; toolUseId: string; line: string }
  | { type: 'childClosed'; toolUseId: string; error?: string }
  | { type: 'childNotified'; toolUseId: string; summary: string }
