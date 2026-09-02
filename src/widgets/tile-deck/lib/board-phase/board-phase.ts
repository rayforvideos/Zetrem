import { MOTION } from '@/shared/config/motion/motion'
import type { BoardPhase, Presence } from './board-phase.types'

// Where the deck is headed, given where it stands and where the crew count
// says it belongs. A count that crosses back mid-flip turns the deck around
// rather than stranding it.
export function nextBoardPhase(phase: BoardPhase, boarded: boolean): BoardPhase {
  if (boarded) return phase === 'board' || phase === 'boarding' ? phase : 'boarding'
  return phase === 'tiles' || phase === 'unboarding' ? phase : 'unboarding'
}

// Where a flip lands once its time is up. A deck already at rest stays put.
export function settledBoardPhase(phase: BoardPhase): BoardPhase {
  if (phase === 'boarding') return 'board'
  if (phase === 'unboarding') return 'tiles'
  return phase
}

// How long the flip runs, or null when nothing is moving. Boarding borrows the
// fan's time because the terminal is widening alongside it; unboarding borrows
// the merge's, because the terminal is closing back over the same beat.
export function boardPhaseMs(phase: BoardPhase): number | null {
  if (phase === 'boarding') return MOTION.fanMs
  if (phase === 'unboarding') return MOTION.mergeMs
  return null
}

export function showsBoard(phase: BoardPhase): boolean {
  return phase !== 'tiles'
}

// The tiles are the deck's own layer: they take the places the grid gives them
// and record the seats they sat in.
export function tilesStanding(phase: BoardPhase): boolean {
  return phase === 'tiles' || phase === 'unboarding'
}

export function boardPresence(phase: BoardPhase): Presence | null {
  if (phase === 'boarding') return 'arriving'
  if (phase === 'unboarding') return 'leaving'
  return null
}

// While the deck is boarding the tiles are a leaving snapshot, not a standing
// layer: they hold their last seats and play out.
export function tilesLeaving(phase: BoardPhase): boolean {
  return phase === 'boarding'
}

// A teammate may only leave as a tile while tiles are the deck's own layer. One
// that finishes under the board never stood as a tile, and drawing its exit
// would flash a tile that was never there.
export function tilesCanLeave(phase: BoardPhase): boolean {
  return phase === 'tiles'
}
