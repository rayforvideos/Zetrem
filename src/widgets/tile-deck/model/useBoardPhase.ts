import { useEffect, useState } from 'react'
import { boardPhaseMs, nextBoardPhase, settledBoardPhase } from '../lib/board-phase/board-phase'
import type { BoardPhase } from '../lib/board-phase/board-phase.types'

// The crew count says which layer the deck belongs on; this says where it is on
// the way there. The phase is derived during render, so the flip begins on the
// very frame the count crosses and no tile is drawn twice in two places; the
// effect only remembers the derivation and hands the flip its time.
export function useBoardPhase(boarded: boolean): BoardPhase {
  const [settled, setSettled] = useState<BoardPhase>('tiles')
  const phase = nextBoardPhase(settled, boarded)

  useEffect(() => {
    if (phase !== settled) {
      setSettled(phase)
      return undefined
    }
    const ms = boardPhaseMs(phase)
    if (ms === null) return undefined
    const timer = setTimeout(() => setSettled(settledBoardPhase(phase)), ms)
    return () => clearTimeout(timer)
  }, [phase, settled])

  return phase
}
