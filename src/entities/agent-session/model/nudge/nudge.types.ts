export type NudgeReason = 'done' | 'permission'

export type Nudge = { reason: NudgeReason; title: string; body: string }

export type NudgeAt = {
  wanted: boolean
  watching: boolean
  reason: NudgeReason
  tool: string
  asked?: boolean
}
