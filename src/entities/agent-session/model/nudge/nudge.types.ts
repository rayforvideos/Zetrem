type NudgeReason = 'done' | 'permission'

export type Nudge = { reason: NudgeReason; title: string; body: string }

export type NudgeAt = {
  wanted: boolean
  watching: boolean
  reason: NudgeReason
  tool: string
  asked?: boolean
  // The settled turn ended in an error, not a clean finish. Only meaningful for reason 'done'.
  trouble?: boolean
}
