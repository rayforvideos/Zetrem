import type { Turn } from '@/entities/conversation'

export const LIVE_TURN_CAP = 400
export const LIVE_OUTPUT_CAP = 200_000

export function heldTurns(turns: Turn[]): Turn[] {
  return turns.length <= LIVE_TURN_CAP ? turns : turns.slice(-LIVE_TURN_CAP)
}

export function heldOutput(text: string): string {
  return text.length <= LIVE_OUTPUT_CAP ? text : `${text.slice(0, LIVE_OUTPUT_CAP)}\n…`
}
